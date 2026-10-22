-- Background job claims, so each job runs once per period across all API servers
CREATE TABLE IF NOT EXISTS "job_runs" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "last_started_at" TIMESTAMP(3) NOT NULL,
    "last_finished_at" TIMESTAMP(3),
    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("name")
);
