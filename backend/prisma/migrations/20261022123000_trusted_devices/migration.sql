-- Trusted browsers skip the emailed sign-in code for 30 days
CREATE TABLE IF NOT EXISTS "trusted_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");
CREATE INDEX IF NOT EXISTS "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");
