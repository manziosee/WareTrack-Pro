import { prisma } from '../lib/prisma';
import { emitEvent } from './events';
import { paidByOrder, refreshOrderPayment } from './finance';
import { providerConfigured, requestCollection, collectionStatus, type Provider } from './payments';

/** A payment problem to show the person (with an HTTP status). */
export class CollectionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function markPaid(orderId: number, paymentId: number) {
  await prisma.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESSFUL', completedAt: new Date() } });
  await refreshOrderPayment(orderId);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: { select: { orderNumber: true } } } });
  emitEvent('payment.completed', { id: paymentId, orderId, orderNumber: payment?.order.orderNumber, amount: Number(payment?.amount), provider: payment?.provider });
}

/**
 * Ask the customer's phone to approve a MoMo / Airtel Money payment for what
 * the order still owes. Used by staff and by the customer portal.
 */
export async function requestMobilePayment(orderId: number, provider: string, phoneNumber?: string | null) {
  if (!['MTN_MOMO', 'AIRTEL_MONEY'].includes(provider)) throw new CollectionError('provider must be MTN_MOMO or AIRTEL_MONEY');
  if (!providerConfigured(provider as Provider)) throw new CollectionError(`${provider === 'MTN_MOMO' ? 'MTN MoMo' : 'Airtel Money'} is not available yet. Please pay on delivery or by bank transfer.`, 503);
  const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new CollectionError('Order not found', 404);
  if (order.paymentStatus === 'PAID') throw new CollectionError('This order is already paid');
  const pending = await prisma.payment.findFirst({ where: { orderId, status: 'PENDING', provider: { in: ['MTN_MOMO', 'AIRTEL_MONEY'] }, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } } });
  if (pending) throw new CollectionError('A payment request was just sent for this order. Approve it on the phone, or wait a few minutes.', 409);
  // Only what is still owed (part may already be paid)
  const paid = (await paidByOrder([orderId])).get(orderId) || 0;
  const amount = Math.max(0, Math.round((Number(order.totalAmount) - paid) * 100) / 100);
  if (!amount) throw new CollectionError('Nothing left to pay on this order');
  const phone = String(phoneNumber || order.contactNumber).replace(/[^\d+]/g, '');
  let result;
  try {
    result = await requestCollection(provider as Provider, amount, phone, order.orderNumber, `WareTrack ${order.orderNumber}`);
  } catch (error: any) {
    console.error('Mobile Money request failed:', error?.response?.data || error?.message);
    throw new CollectionError('The payment provider did not accept the request. Check the phone number and try again.', 502);
  }
  return prisma.payment.create({
    data: { orderId: order.id, accountId: order.accountId, provider, phoneNumber: phone, amount, status: result.status, externalRef: result.reference, message: result.message },
  });
}

/** Check a pending mobile payment with the provider and record the result. */
export async function checkMobilePayment(paymentId: number) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new CollectionError('Payment not found', 404);
  if (payment.status !== 'PENDING' || !payment.externalRef || !['MTN_MOMO', 'AIRTEL_MONEY'].includes(payment.provider)) return payment;
  const result = await collectionStatus(payment.provider as Provider, payment.externalRef);
  if (result.status === 'SUCCESSFUL') await markPaid(payment.orderId, payment.id);
  else if (result.status === 'FAILED') await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', message: result.message } });
  return prisma.payment.findUnique({ where: { id: payment.id } });
}
