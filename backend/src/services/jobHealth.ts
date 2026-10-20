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

export function getJobHealth() {
  const now = Date.now();
  return [...states.entries()].map(([name, state]) => {
    const lastSuccess = state.lastSucceededAt ? new Date(state.lastSucceededAt).getTime() : null;
    const freshnessMs = name === 'scheduled-reports' ? 26 * 60 * 60 * 1000 : name === 'auto-restock' ? 26 * 60 * 60 * 1000 : 45 * 60 * 1000;
    const stale = lastSuccess !== null && now - lastSuccess > freshnessMs;
    return { name, ...state, status: state.consecutiveFailures ? 'failed' : stale ? 'stale' : lastSuccess ? 'ok' : 'pending' };
  });
}
