CREATE TABLE "usage_events" (
  "company_id" INTEGER NOT NULL DEFAULT 1,
  "branch_id" INTEGER,
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "event" TEXT NOT NULL,
  "route" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_events_company_branch_created_idx"
  ON "usage_events"("company_id", "branch_id", "created_at");
CREATE INDEX "usage_events_company_event_created_idx"
  ON "usage_events"("company_id", "event", "created_at");
