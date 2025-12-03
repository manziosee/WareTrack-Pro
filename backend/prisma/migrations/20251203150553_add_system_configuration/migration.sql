-- CreateTable
CREATE TABLE "system_configuration" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configuration_user_id_key" ON "system_configuration"("user_id");

-- AddForeignKey
ALTER TABLE "system_configuration" ADD CONSTRAINT "system_configuration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
