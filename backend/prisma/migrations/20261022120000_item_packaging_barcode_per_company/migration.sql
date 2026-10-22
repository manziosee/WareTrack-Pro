-- Pack barcodes are unique per company instead of across all companies
DROP INDEX IF EXISTS "item_packagings_barcode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "item_packagings_company_id_barcode_key" ON "item_packagings"("company_id", "barcode");
