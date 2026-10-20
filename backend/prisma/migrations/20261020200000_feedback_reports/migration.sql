CREATE TABLE "feedback_reports" (
  "company_id" INTEGER NOT NULL DEFAULT 1,
  "branch_id" INTEGER,
  "id" SERIAL NOT NULL,
  "order_id" INTEGER,
  "submitted_by_id" INTEGER,
  "customer_id" INTEGER,
  "assigned_to_id" INTEGER,
  "resolved_by_id" INTEGER,
  "kind" TEXT NOT NULL DEFAULT 'INTERNAL_ISSUE',
  "category" TEXT NOT NULL,
  "rating" INTEGER,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedback_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "feedback_reports_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "feedback_reports_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "feedback_reports_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "feedback_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "feedback_reports_company_branch_status_created_idx"
  ON "feedback_reports"("company_id", "branch_id", "status", "created_at");
CREATE INDEX "feedback_reports_order_id_idx" ON "feedback_reports"("order_id");
