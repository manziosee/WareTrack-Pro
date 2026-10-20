-- Catalog identifiers are scoped to their owning company. Existing records
-- all belong to the default company, so these replacements preserve current
-- uniqueness while allowing independent companies to reuse their own codes.
DROP INDEX IF EXISTS "inventory_items_code_key";
CREATE UNIQUE INDEX "inventory_items_company_id_code_key" ON "inventory_items"("company_id", "code");

DROP INDEX IF EXISTS "customers_email_key";
CREATE UNIQUE INDEX "customers_company_id_email_key" ON "customers"("company_id", "email");

DROP INDEX IF EXISTS "inventory_categories_name_key";
CREATE UNIQUE INDEX "inventory_categories_company_id_name_key" ON "inventory_categories"("company_id", "name");

DROP INDEX IF EXISTS "warehouses_code_key";
CREATE UNIQUE INDEX "warehouses_company_id_code_key" ON "warehouses"("company_id", "code");
