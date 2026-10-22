-- Photos, signatures and receipts move out of the business tables
CREATE TABLE IF NOT EXISTS "stored_files" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "kind" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage" TEXT NOT NULL,
    "object_key" TEXT,
    "data" BYTEA,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stored_files_company_id_kind_idx" ON "stored_files"("company_id", "kind");
