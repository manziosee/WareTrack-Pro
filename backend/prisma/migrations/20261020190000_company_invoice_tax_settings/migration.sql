ALTER TABLE "companies"
  ADD COLUMN "legal_address" TEXT,
  ADD COLUMN "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.1800,
  ADD COLUMN "invoice_prefix" TEXT NOT NULL DEFAULT 'INV';
