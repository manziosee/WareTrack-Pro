import crypto from 'crypto';
import os from 'os';
import { prisma } from '../lib/prisma';
import { runWithoutTenant } from '../lib/tenantContext';

/** Identifies this server process in job_runs. */
export const INSTANCE_ID = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;

/**
 * Claim a job for this period. Returns true for exactly one server: the row is
 * only taken when its last start is older than `windowMs`, in one atomic
 * statement, so two servers can never both run the same job in the same period.
 */
export async function claimJob(name: string, windowMs: number): Promise<boolean> {
  const rows = await runWithoutTenant(() =>
    prisma.$queryRaw<{ name: string }[]>`
      INSERT INTO job_runs (name, owner, last_started_at)
      VALUES (${name}, ${INSTANCE_ID}, NOW())
      ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, last_started_at = NOW(), last_finished_at = NULL
      WHERE job_runs.last_started_at < NOW() - (${windowMs}::text || ' milliseconds')::interval
      RETURNING name`
  );
  return rows.length === 1;
}

export async function finishJob(name: string) {
  await runWithoutTenant(() => prisma.$executeRaw`UPDATE job_runs SET last_finished_at = NOW() WHERE name = ${name} AND owner = ${INSTANCE_ID}`);
}
