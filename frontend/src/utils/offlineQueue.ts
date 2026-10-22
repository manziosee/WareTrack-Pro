/**
 * Driver actions saved while offline (proof of delivery with photo and
 * signature, failed deliveries, cash). Kept in IndexedDB, which holds far more
 * than localStorage, so photos survive a long day without signal. A copy lives
 * in memory so the page can read it synchronously; writes go through to disk.
 * Falls back to localStorage where IndexedDB is unavailable (old browsers,
 * some private modes).
 */

const DB_NAME = 'waretrack-offline';
const STORE = 'kv';
const KEY = 'pod-queue';
const LEGACY_KEY = 'waretrack-pod-queue';

let memory: any[] = [];
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        // Let another tab (or a newer version) upgrade or delete the database
        req.result.onversionchange = () => {
          req.result.close();
          dbPromise = null;
        };
        resolve(req.result);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    if (!db) return reject(new Error('IndexedDB unavailable'));
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

function readLegacy(): any[] {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Load the queue from disk (moving any entries left in localStorage by older versions). */
export async function loadQueue(): Promise<any[]> {
  const legacy = readLegacy();
  try {
    const stored = ((await run('readonly', (s) => s.get(KEY))) as any[] | undefined) || [];
    memory = [...stored, ...legacy.filter((l) => !stored.some((s) => s.id && s.id === l.id))];
    if (legacy.length) {
      await run('readwrite', (s) => s.put(memory, KEY));
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    memory = legacy;
  }
  return memory;
}

/** The queue as last loaded or written. */
export function currentQueue(): any[] {
  return memory;
}

/** Save the queue. Returns false only when nothing could be stored. */
export async function saveQueue(items: any[]): Promise<{ ok: boolean; droppedPhotos?: boolean }> {
  memory = items;
  try {
    await run('readwrite', (s) => s.put(items, KEY));
    return { ok: true };
  } catch {
    // No IndexedDB: localStorage, dropping photos if the phone is full
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(items));
      return { ok: true };
    } catch {
      try {
        const light = items.map((i) => ({ ...i, body: { ...i.body, photoData: undefined } }));
        localStorage.setItem(LEGACY_KEY, JSON.stringify(light));
        memory = light;
        return { ok: true, droppedPhotos: true };
      } catch {
        return { ok: false };
      }
    }
  }
}
