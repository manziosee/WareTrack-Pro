-- Establish a default tenant and branch for existing WareTrack data.
CREATE TABLE "companies" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "legal_name" TEXT,
  "tax_number" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'RWF',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Kigali',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
INSERT INTO "companies" ("id", "name", "slug", "updated_at") VALUES (1, 'WareTrack', 'waretrack-default', CURRENT_TIMESTAMP);
SELECT setval(pg_get_serial_sequence('companies', 'id'), GREATEST((SELECT MAX(id) FROM companies), 1));

CREATE TABLE "branches" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "branches_company_id_code_key" ON "branches"("company_id", "code");
CREATE INDEX "branches_company_id_active_idx" ON "branches"("company_id", "active");
INSERT INTO "branches" ("id", "company_id", "name", "code") VALUES (1, 1, 'Main Branch', 'MAIN');
SELECT setval(pg_get_serial_sequence('branches', 'id'), GREATEST((SELECT MAX(id) FROM branches), 1));

CREATE TABLE "company_memberships" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "company_memberships_company_id_user_id_key" ON "company_memberships"("company_id", "user_id");
CREATE INDEX "company_memberships_user_id_active_idx" ON "company_memberships"("user_id", "active");
INSERT INTO "company_memberships" ("company_id", "user_id", "role", "active") SELECT 1, "id", "role"::text, ("status"::text = 'ACTIVE') FROM "users";

CREATE TABLE "branch_memberships" (
  "id" SERIAL NOT NULL,
  "company_membership_id" INTEGER NOT NULL,
  "branch_id" INTEGER NOT NULL,
  "role_override" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_memberships_company_membership_id_fkey" FOREIGN KEY ("company_membership_id") REFERENCES "company_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "branch_memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "branch_memberships_company_membership_id_branch_id_key" ON "branch_memberships"("company_membership_id", "branch_id");
CREATE INDEX "branch_memberships_branch_id_active_idx" ON "branch_memberships"("branch_id", "active");
INSERT INTO "branch_memberships" ("company_membership_id", "branch_id", "active") SELECT "id", 1, "active" FROM "company_memberships";

CREATE TABLE "role_permissions" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "branch_id" INTEGER,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "role_permissions_company_role_permission_branch_key" ON "role_permissions"("company_id", "role", "permission", "branch_id") NULLS NOT DISTINCT;
CREATE INDEX "role_permissions_company_branch_permission_idx" ON "role_permissions"("company_id", "branch_id", "permission");

ALTER TABLE "users" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "users_company_id_branch_id_idx" ON "users"("company_id", "branch_id");

ALTER TABLE "inventory_items" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "inventory_items" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "inventory_items_company_id_branch_id_idx" ON "inventory_items"("company_id", "branch_id");

ALTER TABLE "vehicles" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "vehicles" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "vehicles_company_id_branch_id_idx" ON "vehicles"("company_id", "branch_id");

ALTER TABLE "drivers" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "drivers" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "drivers_company_id_branch_id_idx" ON "drivers"("company_id", "branch_id");

ALTER TABLE "delivery_orders" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "delivery_orders" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "delivery_orders_company_id_branch_id_idx" ON "delivery_orders"("company_id", "branch_id");

ALTER TABLE "order_items" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "order_items" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "order_items_company_id_branch_id_idx" ON "order_items"("company_id", "branch_id");

ALTER TABLE "stock_reservations" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stock_reservations" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "stock_reservations_company_id_branch_id_idx" ON "stock_reservations"("company_id", "branch_id");

ALTER TABLE "dispatches" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "dispatches" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "dispatches_company_id_branch_id_idx" ON "dispatches"("company_id", "branch_id");

ALTER TABLE "maintenance_records" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "maintenance_records" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "maintenance_records_company_id_branch_id_idx" ON "maintenance_records"("company_id", "branch_id");

ALTER TABLE "inventory_history" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "inventory_history" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "inventory_history_company_id_branch_id_idx" ON "inventory_history"("company_id", "branch_id");

ALTER TABLE "notification_preferences" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notification_preferences" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "notification_preferences_company_id_branch_id_idx" ON "notification_preferences"("company_id", "branch_id");

ALTER TABLE "system_configuration" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "system_configuration" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "system_configuration_company_id_branch_id_idx" ON "system_configuration"("company_id", "branch_id");

ALTER TABLE "report_settings" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "report_settings" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "report_settings_company_id_branch_id_idx" ON "report_settings"("company_id", "branch_id");

ALTER TABLE "notifications" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notifications" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "notifications_company_id_branch_id_idx" ON "notifications"("company_id", "branch_id");

ALTER TABLE "delivery_proofs" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "delivery_proofs" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "delivery_proofs_company_id_branch_id_idx" ON "delivery_proofs"("company_id", "branch_id");

ALTER TABLE "chat_messages" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "chat_messages" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "chat_messages_company_id_branch_id_idx" ON "chat_messages"("company_id", "branch_id");

ALTER TABLE "driver_achievements" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "driver_achievements" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "driver_achievements_company_id_branch_id_idx" ON "driver_achievements"("company_id", "branch_id");

ALTER TABLE "driver_leaderboard" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "driver_leaderboard" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "driver_leaderboard_company_id_branch_id_idx" ON "driver_leaderboard"("company_id", "branch_id");

ALTER TABLE "inventory_forecasts" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "inventory_forecasts" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "inventory_forecasts_company_id_branch_id_idx" ON "inventory_forecasts"("company_id", "branch_id");

ALTER TABLE "smart_alerts" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "smart_alerts" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "smart_alerts_company_id_branch_id_idx" ON "smart_alerts"("company_id", "branch_id");

ALTER TABLE "customers" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "customers" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "customers_company_id_branch_id_idx" ON "customers"("company_id", "branch_id");

ALTER TABLE "customer_ratings" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "customer_ratings" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "customer_ratings_company_id_branch_id_idx" ON "customer_ratings"("company_id", "branch_id");

ALTER TABLE "vehicle_health" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "vehicle_health" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "vehicle_health_company_id_branch_id_idx" ON "vehicle_health"("company_id", "branch_id");

ALTER TABLE "user_preferences" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_preferences" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "user_preferences_company_id_branch_id_idx" ON "user_preferences"("company_id", "branch_id");

ALTER TABLE "barcode_logs" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "barcode_logs" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "barcode_logs_company_id_branch_id_idx" ON "barcode_logs"("company_id", "branch_id");

ALTER TABLE "warehouses" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "warehouses" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "warehouses_company_id_branch_id_idx" ON "warehouses"("company_id", "branch_id");

ALTER TABLE "warehouse_stock" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "warehouse_stock" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "warehouse_stock_company_id_branch_id_idx" ON "warehouse_stock"("company_id", "branch_id");

ALTER TABLE "stock_transfers" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stock_transfers" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "stock_transfers_company_id_branch_id_idx" ON "stock_transfers"("company_id", "branch_id");

ALTER TABLE "suppliers" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "suppliers" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "suppliers_company_id_branch_id_idx" ON "suppliers"("company_id", "branch_id");

ALTER TABLE "purchase_orders" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "purchase_orders" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "purchase_orders_company_id_branch_id_idx" ON "purchase_orders"("company_id", "branch_id");

ALTER TABLE "purchase_order_items" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "purchase_order_items" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "purchase_order_items_company_id_branch_id_idx" ON "purchase_order_items"("company_id", "branch_id");

ALTER TABLE "inventory_batches" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "inventory_batches" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "inventory_batches_company_id_branch_id_idx" ON "inventory_batches"("company_id", "branch_id");

ALTER TABLE "return_requests" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "return_requests" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "return_requests_company_id_branch_id_idx" ON "return_requests"("company_id", "branch_id");

ALTER TABLE "payments" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payments" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "payments_company_id_branch_id_idx" ON "payments"("company_id", "branch_id");

ALTER TABLE "invoices" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "invoices" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "invoices_company_id_branch_id_idx" ON "invoices"("company_id", "branch_id");

ALTER TABLE "audit_logs" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "audit_logs" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "audit_logs_company_id_branch_id_idx" ON "audit_logs"("company_id", "branch_id");

ALTER TABLE "otp_codes" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "otp_codes" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "otp_codes_company_id_branch_id_idx" ON "otp_codes"("company_id", "branch_id");

ALTER TABLE "webhooks" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "webhooks" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "webhooks_company_id_branch_id_idx" ON "webhooks"("company_id", "branch_id");

ALTER TABLE "saved_filters" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "saved_filters" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "saved_filters_company_id_branch_id_idx" ON "saved_filters"("company_id", "branch_id");

ALTER TABLE "saved_reports" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "saved_reports" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "saved_reports_company_id_branch_id_idx" ON "saved_reports"("company_id", "branch_id");

ALTER TABLE "inventory_categories" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "inventory_categories" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "inventory_categories_company_id_branch_id_idx" ON "inventory_categories"("company_id", "branch_id");

ALTER TABLE "customer_accounts" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "customer_accounts" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "customer_accounts_company_id_branch_id_idx" ON "customer_accounts"("company_id", "branch_id");

ALTER TABLE "cash_handovers" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "cash_handovers" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "cash_handovers_company_id_branch_id_idx" ON "cash_handovers"("company_id", "branch_id");

ALTER TABLE "expenses" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "expenses" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "expenses_company_id_branch_id_idx" ON "expenses"("company_id", "branch_id");

ALTER TABLE "item_packagings" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "item_packagings" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "item_packagings_company_id_branch_id_idx" ON "item_packagings"("company_id", "branch_id");

ALTER TABLE "stock_counts" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stock_counts" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "stock_counts_company_id_branch_id_idx" ON "stock_counts"("company_id", "branch_id");

ALTER TABLE "stock_count_lines" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stock_count_lines" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "stock_count_lines_company_id_branch_id_idx" ON "stock_count_lines"("company_id", "branch_id");

ALTER TABLE "push_subscriptions" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "push_subscriptions" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "push_subscriptions_company_id_branch_id_idx" ON "push_subscriptions"("company_id", "branch_id");

ALTER TABLE "api_keys" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "api_keys" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "api_keys_company_id_branch_id_idx" ON "api_keys"("company_id", "branch_id");

ALTER TABLE "app_settings" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "app_settings" ADD COLUMN "branch_id" INTEGER;
CREATE INDEX "app_settings_company_id_branch_id_idx" ON "app_settings"("company_id", "branch_id");

-- Existing operational records belong to the pre-existing Main Branch.
UPDATE "delivery_orders" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "order_items" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "stock_reservations" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "dispatches" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "maintenance_records" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "inventory_history" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "notifications" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "chat_messages" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "driver_achievements" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "inventory_forecasts" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "smart_alerts" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "customer_ratings" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "vehicle_health" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "barcode_logs" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "warehouses" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "warehouse_stock" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "stock_transfers" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "purchase_orders" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "purchase_order_items" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "inventory_batches" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "return_requests" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "payments" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "invoices" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "audit_logs" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "saved_filters" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "saved_reports" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "drivers" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "vehicles" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "cash_handovers" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "expenses" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "stock_counts" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "stock_count_lines" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "api_keys" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "push_subscriptions" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
UPDATE "delivery_proofs" SET "branch_id" = 1 WHERE "branch_id" IS NULL;
