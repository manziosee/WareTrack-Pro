import { claimJob, finishJob } from '../services/jobLock';

describe('Background job claims', () => {
  it('only one of many simultaneous claims wins', async () => {
    const name = `test-job-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => claimJob(name, 60_000)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('the job can be claimed again once its period has passed', async () => {
    const name = `test-window-${Date.now()}`;
    expect(await claimJob(name, 60_000)).toBe(true);
    await finishJob(name);
    expect(await claimJob(name, 60_000)).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(await claimJob(name, 50)).toBe(true);
  });
});
