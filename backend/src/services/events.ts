import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { emitToRoles } from './realtime';
import { createSafeWebhookAgents, isSafeWebhookUrl } from '../utils/webhookSecurity';

/**
 * Business events. Each event is:
 *  - pushed live to staff browsers (Socket.IO), and
 *  - delivered to any registered webhooks, signed with HMAC-SHA256.
 */
export const EVENT_TYPES = [
  'order.created',
  'order.status_changed',
  'order.failed',
  'dispatch.created',
  'delivery.completed',
  'return.created',
  'return.updated',
  'payment.completed',
  'purchase_order.received',
  'stock.low',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const STAFF = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'];

export function emitEvent(type: EventType, data: Record<string, unknown>) {
  const event = { id: crypto.randomUUID(), type, createdAt: new Date().toISOString(), data };
  emitToRoles(STAFF, 'event', event);
  deliverWebhooks(event).catch((error) => console.error('Webhook delivery failed:', error?.message));
}

export function signPayload(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliverWebhooks(event: { id: string; type: string; createdAt: string; data: unknown }) {
  const hooks = await prisma.webhook.findMany({ where: { active: true, events: { has: event.type } } });
  await Promise.all(
    hooks.map(async (hook) => {
      const body = JSON.stringify(event);
      let status = 0;
      try {
        if (!(await isSafeWebhookUrl(hook.url))) throw new Error('Webhook URL is no longer safe');
        const res = await axios.post(hook.url, body, {
          timeout: 8000,
          maxRedirects: 0,
          ...createSafeWebhookAgents(),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WareTrack-Pro-Webhooks/1.0',
            'X-WareTrack-Event': event.type,
            'X-WareTrack-Delivery': event.id,
            'X-WareTrack-Signature': `sha256=${signPayload(hook.secret, body)}`,
          },
          validateStatus: () => true,
        });
        status = res.status;
      } catch {
        status = 0;
      }
      await prisma.webhook.update({ where: { id: hook.id }, data: { lastStatus: status, lastDeliveredAt: new Date() } }).catch(() => undefined);
    })
  );
}
