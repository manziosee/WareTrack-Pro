type JobState = { lastStartedAt?: string; lastSucceededAt?: string; lastFailedAt?: string; consecutiveFailures: number };
const states = new Map<string, JobState>();

export function recordJobStart(name: string) {
  const current = states.get(name) || { consecutiveFailures: 0 };
  current.lastStartedAt = new Date().toISOString();
  states.set(name, current);
}

export function recordJobSuccess(name: string) {
  const current = states.get(name) || { consecutiveFailures: 0 };
  current.lastSucceededAt = new Date().toISOString();
  current.consecutiveFailures = 0;
  states.set(name, current);
}

export function recordJobFailure(name: string) {
  const current = states.get(name) || { consecutiveFailures: 0 };
  current.lastFailedAt = new Date().toISOString();
  current.consecutiveFailures++;
  states.set(name, current);
}

const HOUR = 60 * 60 * 1000;

/**
 * How long after its last success a job counts as stale. Startup jobs run once
 * per server start, so they never go stale; daily jobs get a day plus margin.
 */
const FRESHNESS_MS: Record<string, number | null> = {
  'dedupe-notifications': null,
  'customer-accounts': null,
  'fleet-status': null,
  'auto-restock': 26 * HOUR,
  'daily-briefing': 26 * HOUR,
  'scheduled-reports': 2 * HOUR,
};
const DEFAULT_FRESHNESS_MS = 45 * 60 * 1000; // jobs that run every 15 minutes

export function getJobHealth() {
  const now = Date.now();
  return [...states.entries()].map(([name, state]) => {
    const lastSuccess = state.lastSucceededAt ? new Date(state.lastSucceededAt).getTime() : null;
    const freshnessMs = name in FRESHNESS_MS ? FRESHNESS_MS[name] : DEFAULT_FRESHNESS_MS;
    const stale = lastSuccess !== null && freshnessMs !== null && now - lastSuccess > freshnessMs;
    return { name, ...state, status: state.consecutiveFailures ? 'failed' : stale ? 'stale' : lastSuccess ? 'ok' : 'pending' };
  });
}
