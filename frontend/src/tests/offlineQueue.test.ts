import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** The driver's offline queue lives in IndexedDB and takes over old localStorage entries. */
describe('offline queue', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    await new Promise((done) => { const req = indexedDB.deleteDatabase('waretrack-offline'); req.onsuccess = req.onerror = req.onblocked = done; });
  });

  it('keeps saved actions, photos included, across page loads', async () => {
    const q = await import('@/utils/offlineQueue');
    const photo = `data:image/jpeg;base64,${'A'.repeat(200_000)}`;
    expect((await q.saveQueue([{ id: 'a', url: '/my-deliveries/1/complete', body: { photoData: photo } }])).ok).toBe(true);
    expect(localStorage.getItem('waretrack-pod-queue')).toBeNull();

    vi.resetModules();
    const reloaded = await import('@/utils/offlineQueue');
    const items = await reloaded.loadQueue();
    expect(items).toHaveLength(1);
    expect(items[0].body.photoData).toBe(photo);
  });

  it('moves entries saved by the old localStorage version into IndexedDB', async () => {
    localStorage.setItem('waretrack-pod-queue', JSON.stringify([{ id: 'old', url: '/orders/2/fail', body: { reason: 'Road closed' } }]));
    const q = await import('@/utils/offlineQueue');
    const items = await q.loadQueue();
    expect(items.map((i) => i.id)).toEqual(['old']);
    expect(localStorage.getItem('waretrack-pod-queue')).toBeNull();
    expect(q.currentQueue()).toHaveLength(1);
  });
});
