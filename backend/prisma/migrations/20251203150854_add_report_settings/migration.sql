-- CreateTable
CREATE TABLE "report_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "auto_reports_enabled" BOOLEAN NOT NULL DEFAULT false,
    "report_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "report_format" TEXT NOT NULL DEFAULT 'pdf',
    "email_reports" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_settings_user_id_key" ON "report_settings"("user_id");

-- AddForeignKey
ALTER TABLE "report_settings" ADD CONSTRAINT "report_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
