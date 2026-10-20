ALTER TABLE "delivery_proofs" ADD COLUMN IF NOT EXISTS "delivered_items" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_company_id_barcode_key" ON "inventory_items"("company_id", "barcode");
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "legacy_barcodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "inventory_items"
SET "legacy_barcodes" = CASE
      WHEN "barcode" IS NOT NULL AND "barcode" <> '' AND "barcode" IS DISTINCT FROM (
        'WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0')
      ) THEN array_append("legacy_barcodes", "barcode")
      ELSE "legacy_barcodes"
    END,
    "barcode" = 'WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0')
WHERE "barcode" IS DISTINCT FROM ('WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0'));
