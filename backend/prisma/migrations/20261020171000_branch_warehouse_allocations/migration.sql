ALTER TABLE "stock_reservations" ADD COLUMN "warehouse_id" INTEGER;
DROP INDEX IF EXISTS "stock_reservations_order_id_item_id_key";
CREATE UNIQUE INDEX "stock_reservations_order_id_item_id_warehouse_id_key"
  ON "stock_reservations"("order_id", "item_id", "warehouse_id");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve legacy on-hand inventory by placing any quantity not already
-- represented in warehouse stock into the default branch warehouse.
INSERT INTO "warehouses" ("company_id", "branch_id", "name", "code", "active", "created_at", "updated_at")
SELECT 1, 1, 'Main Warehouse', 'MAIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "warehouses" WHERE "company_id" = 1 AND "branch_id" = 1);

WITH default_warehouse AS (
  SELECT "id" FROM "warehouses" WHERE "company_id" = 1 AND "branch_id" = 1 ORDER BY "id" LIMIT 1
), stock_totals AS (
  SELECT item."id" AS item_id, item."quantity" AS item_quantity,
         COALESCE(SUM(stock."quantity"), 0)::integer AS warehouse_quantity
  FROM "inventory_items" item
  LEFT JOIN "warehouse_stock" stock ON stock."item_id" = item."id" AND stock."company_id" = 1
    AND (stock."branch_id" = 1 OR stock."branch_id" IS NULL)
  WHERE item."company_id" = 1
  GROUP BY item."id", item."quantity"
)
INSERT INTO "warehouse_stock" ("company_id", "branch_id", "warehouse_id", "item_id", "quantity", "updated_at")
SELECT 1, 1, warehouse."id", totals."item_id", totals."item_quantity" - totals."warehouse_quantity", CURRENT_TIMESTAMP
FROM stock_totals totals CROSS JOIN default_warehouse warehouse
WHERE totals."item_quantity" > totals."warehouse_quantity"
ON CONFLICT ("warehouse_id", "item_id") DO UPDATE SET
  "quantity" = "warehouse_stock"."quantity" + EXCLUDED."quantity",
  "updated_at" = CURRENT_TIMESTAMP;

-- Warehouse stock is authoritative after allocation. Earlier warehouses may
-- already contain more than the legacy inventory_items.quantity cache; retain
-- that physically recorded stock and bring the cache up to the branch total.
UPDATE "inventory_items" AS item
SET "quantity" = stock_totals.quantity,
    "last_updated" = CURRENT_TIMESTAMP
FROM (
  SELECT "item_id", SUM("quantity")::integer AS quantity
  FROM "warehouse_stock"
  WHERE "company_id" = 1 AND ("branch_id" = 1 OR "branch_id" IS NULL)
  GROUP BY "item_id"
) AS stock_totals
WHERE item."id" = stock_totals."item_id"
  AND item."company_id" = 1
  AND item."quantity" <> stock_totals.quantity;
