import { prisma } from '../lib/prisma';

const cache = new Map<string, { value: unknown; at: number }>();
const TTL = 30_000;

/** Read an app-wide setting (cached for 30 seconds). */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const value = (row?.value ?? fallback) as T;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key: string, value: unknown) {
  await prisma.appSetting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  cache.set(key, { value, at: Date.now() });
}

/** Online ordering page settings. */
export interface OnlineOrdering {
  enabled: boolean;
  businessName: string;
  phone: string;
  message: string;
  minimumOrder: number;
}

export const ONLINE_ORDERING_DEFAULTS: OnlineOrdering = {
  enabled: false,
  businessName: 'WareTrack Pro',
  phone: '',
  message: 'Order online and we deliver across Kigali.',
  minimumOrder: 0,
};
