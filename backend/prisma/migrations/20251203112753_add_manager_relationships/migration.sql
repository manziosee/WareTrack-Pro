-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "hire_date" TIMESTAMP(3),
ADD COLUMN     "license_expiry" TIMESTAMP(3),
ADD COLUMN     "manager_id" INTEGER,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "manager_id" INTEGER;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
