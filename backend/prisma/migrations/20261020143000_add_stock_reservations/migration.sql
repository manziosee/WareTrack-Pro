CREATE TABLE "stock_reservations" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_reservations_order_id_item_id_key" ON "stock_reservations"("order_id", "item_id");
CREATE INDEX "stock_reservations_item_id_status_idx" ON "stock_reservations"("item_id", "status");

ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "inventory_history" AS history
SET "order_id" = NULL
WHERE history."order_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "delivery_orders" AS orders WHERE orders."id" = history."order_id");

ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_requests" ADD COLUMN "photo_url" TEXT;
