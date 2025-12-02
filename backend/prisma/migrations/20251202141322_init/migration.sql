-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_DUTY', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WAREHOUSE_STAFF',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "unit_category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "barcode" TEXT,
    "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "supplier" TEXT,
    "description" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "plate_number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "last_maintenance" TIMESTAMP(3),
    "fuel_type" TEXT,
    "vehicle_model" TEXT,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_vehicle_id" INTEGER,
    "experience" INTEGER,
    "rating" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "customer_name" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "priority" "OrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "order_type" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "delivery_instructions" TEXT,
    "driver_id" INTEGER,
    "vehicle_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "total_price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "dispatched_at" TIMESTAMP(3),
    "estimated_delivery" TIMESTAMP(3),
    "actual_delivery" TIMESTAMP(3),
    "fuel_allowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "route" TEXT,
    "notes" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "odometer_reading" INTEGER,
    "next_service_odometer" INTEGER,
    "next_service_date" TIMESTAMP(3),
    "performed_by" TEXT,
    "notes" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_history" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "order_id" INTEGER,
    "notes" TEXT,
    "performed_by" INTEGER NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_code_key" ON "inventory_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_order_number_key" ON "delivery_orders"("order_number");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_current_vehicle_id_fkey" FOREIGN KEY ("current_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
