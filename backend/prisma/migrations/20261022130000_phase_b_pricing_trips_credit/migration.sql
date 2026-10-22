-- AlterTable
ALTER TABLE "customer_accounts" ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "price_list_id" INTEGER;

-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN     "trip_id" INTEGER;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "track_serials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vat_exempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "volume_l" DECIMAL(10,3),
ADD COLUMN     "weight_kg" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "batch_allocations" JSONB,
ADD COLUMN     "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "list_price" DECIMAL(14,2),
ADD COLUMN     "serial_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vat_rate" DECIMAL(5,4);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "volume_l" DECIMAL(10,1);

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "trip_number" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "planned_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "credit_note_number" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "return_id" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "applied_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "price_list_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "item_id" INTEGER,
    "category" TEXT,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_serials" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "item_id" INTEGER NOT NULL,
    "serial_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "order_id" INTEGER,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sold_at" TIMESTAMP(3),

    CONSTRAINT "item_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "vehicle_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "provider" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "file_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trips_trip_number_key" ON "trips"("trip_number");

-- CreateIndex
CREATE INDEX "trips_company_id_branch_id_status_idx" ON "trips"("company_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_credit_note_number_key" ON "credit_notes"("credit_note_number");

-- CreateIndex
CREATE INDEX "credit_notes_company_id_account_id_idx" ON "credit_notes"("company_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_company_id_name_key" ON "price_lists"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_item_id_key" ON "price_list_items"("price_list_id", "item_id");

-- CreateIndex
CREATE INDEX "promotions_company_id_active_ends_at_idx" ON "promotions"("company_id", "active", "ends_at");

-- CreateIndex
CREATE INDEX "item_serials_company_id_item_id_status_idx" ON "item_serials"("company_id", "item_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "item_serials_company_id_serial_number_key" ON "item_serials"("company_id", "serial_number");

-- CreateIndex
CREATE INDEX "vehicle_documents_company_id_expires_at_idx" ON "vehicle_documents"("company_id", "expires_at");

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_serials" ADD CONSTRAINT "item_serials_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "feedback_reports_company_branch_status_created_idx" RENAME TO "feedback_reports_company_id_branch_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "role_permissions_company_branch_permission_idx" RENAME TO "role_permissions_company_id_branch_id_permission_idx";

-- RenameIndex
ALTER INDEX "role_permissions_company_role_permission_branch_key" RENAME TO "role_permissions_company_id_role_permission_branch_id_key";

-- RenameIndex
ALTER INDEX "usage_events_company_branch_created_idx" RENAME TO "usage_events_company_id_branch_id_created_at_idx";

-- RenameIndex
ALTER INDEX "usage_events_company_event_created_idx" RENAME TO "usage_events_company_id_event_created_at_idx";

