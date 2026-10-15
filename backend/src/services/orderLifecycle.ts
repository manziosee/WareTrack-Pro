import { prisma } from '../lib/prisma';
import { emitEvent } from './events';
import { notifyCustomer, orderStatusMessage } from './messaging';

export const ORDER_STATUSES = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'] as const;

/** Customer-facing statuses that trigger an SMS/WhatsApp message. */
const NOTIFY = new Set(['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']);

/**
 * Side effects of an order status change: live update, webhooks and a
 * customer message. Never throws, so it can't break the request that caused it.
 */
export async function onOrderStatusChanged(orderId: number, previousStatus?: string | null) {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, customerName: true, contactNumber: true, status: true, timeSlotStart: true,
        totalAmount: true, driver: { select: { name: true } },
      },
    });
    if (!order || order.status === previousStatus) return;

    const payload = { id: order.id, orderNumber: order.orderNumber, status: order.status, previousStatus: previousStatus ?? null };
    emitEvent('order.status_changed', payload);
    if (order.status === 'DELIVERED') emitEvent('delivery.completed', { ...payload, totalAmount: Number(order.totalAmount) });
    if (order.status === 'FAILED') emitEvent('order.failed', payload);

    if (NOTIFY.has(order.status)) {
      await notifyCustomer(
        order.contactNumber,
        orderStatusMessage({ ...order, driverName: order.driver?.name })
      );
    }
  } catch (error: any) {
    console.error('Order lifecycle hook failed:', error?.message);
  }
}
