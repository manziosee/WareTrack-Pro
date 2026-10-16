import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { getSetting, setSetting } from './appSettings';

/**
 * Web Push (phone and browser notifications, even when the app is closed).
 * Keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, or are generated once
 * and stored in the database so subscriptions keep working across restarts.
 */
let keys: { publicKey: string; privateKey: string } | null = null;

async function vapid() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const stored = await getSetting<{ publicKey: string; privateKey: string } | null>('vapidKeys', null);
    if (stored?.publicKey && stored?.privateKey) keys = stored;
    else {
      keys = webpush.generateVAPIDKeys();
      await setSetting('vapidKeys', keys);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@waretrack.rw', keys.publicKey, keys.privateKey);
  return keys;
}

export async function publicKey() {
  return (await vapid()).publicKey;
}

export async function saveSubscription(userId: number, sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } }, userAgent?: string) {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw Object.assign(new Error('Invalid subscription'), { status: 400 });
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 200), lastUsed: new Date() },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 200) },
  });
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Send to every device of the given users; expired subscriptions are removed. Never throws. */
export async function pushToUsers(userIds: number[], message: PushMessage) {
  try {
    if (!userIds.length) return 0;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    if (!subs.length) return 0;
    await vapid();
    const payload = JSON.stringify({ title: message.title, body: message.body.slice(0, 300), url: message.url || '/notifications', tag: message.tag });
    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
      }
    }));
    return sent;
  } catch (error: any) {
    console.error('Push failed:', error?.message);
    return 0;
  }
}
