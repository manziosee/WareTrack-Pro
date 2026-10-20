ALTER TABLE "delivery_proofs" ADD COLUMN "delivered_items" JSONB;
CREATE UNIQUE INDEX "inventory_items_company_id_barcode_key" ON "inventory_items"("company_id", "barcode");
