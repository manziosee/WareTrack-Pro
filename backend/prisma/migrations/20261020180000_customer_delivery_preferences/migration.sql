ALTER TABLE "customers"
  ADD COLUMN "preferred_delivery_window" TEXT,
  ADD COLUMN "delivery_instructions" TEXT,
  ADD COLUMN "contact_preference" TEXT NOT NULL DEFAULT 'ANY';
