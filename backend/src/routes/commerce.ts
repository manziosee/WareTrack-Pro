import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { providerConfigured, requestCollection, collectionStatus, type Provider } from '../services/payments';
import { emitEvent } from '../services/events';

/** Payments (Mobile Money, cash, bank) and invoices. Mounted at /api. */
const router = Router();
const staff = [auth, authorizeRoles(...ROLES.orderManagers)];
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 503 ? 'NOT_CONFIGURED' : 'VALIDATION_ERROR', message } });

const VAT = 0.18;

async function markPaid(orderId: number, paymentId: number) {
  await prisma.$transaction([
    prisma.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESSFUL', completedAt: new Date() } }),
    prisma.deliveryOrder.update({ where: { id: orderId }, data: { paymentStatus: 'PAID' } }),
    prisma.invoice.updateMany({ where: { orderId }, data: { status: 'PAID', paidAt: new Date() } }),
  ]);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: { select: { orderNumber: true } } } });
  emitEvent('payment.completed', { id: paymentId, orderId, orderNumber: payment?.order.orderNumber, amount: Number(payment?.amount), provider: payment?.provider });
}

router.get('/payments/providers', auth, (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'MTN_MOMO', name: 'MTN Mobile Money', configured: providerConfigured('MTN_MOMO') },
      { id: 'AIRTEL_MONEY', name: 'Airtel Money', configured: providerConfigured('AIRTEL_MONEY') },
      { id: 'CASH', name: 'Cash on delivery', configured: true },
      { id: 'BANK_TRANSFER', name: 'Bank transfer', configured: true },
    ],
  });
});

router.get('/payments', ...staff, async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: req.query.orderId ? { orderId: Number(req.query.orderId) } : {},
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { order: { select: { orderNumber: true, customerName: true } } },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
});

/** Ask the customer to approve a Mobile Money payment on their phone. */
router.post('/payments/request', ...staff, async (req, res, next) => {
  try {
    const { orderId, provider, phoneNumber } = req.body || {};
    if (!['MTN_MOMO', 'AIRTEL_MONEY'].includes(provider)) return bad(res, 'provider must be MTN_MOMO or AIRTEL_MONEY');
    if (!providerConfigured(provider)) return bad(res, `${provider === 'MTN_MOMO' ? 'MTN MoMo' : 'Airtel Money'} is not configured yet. Add the API keys in the server settings.`, 503);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(orderId) } });
    if (!order) return bad(res, 'Order not found', 404);
    if (order.paymentStatus === 'PAID') return bad(res, 'This order is already paid');
    const phone = phoneNumber || order.contactNumber;
    const amount = Number(order.totalAmount);

    let result;
    try {
      result = await requestCollection(provider as Provider, amount, phone, order.orderNumber, `WareTrack ${order.orderNumber}`);
    } catch (error: any) {
      console.error('Mobile Money request failed:', error?.response?.data || error?.message);
      return bad(res, 'The payment provider did not accept the request. Check the phone number and try again.', 502);
    }
    const payment = await prisma.payment.create({
      data: { orderId: order.id, provider, phoneNumber: phone, amount, status: result.status, externalRef: result.reference, message: result.message },
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

/** Check a pending Mobile Money payment with the provider. */
router.get('/payments/:id/status', ...staff, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: Number(req.params.id) } });
    if (!payment) return bad(res, 'Payment not found', 404);
    if (payment.status !== 'PENDING' || !payment.externalRef || !['MTN_MOMO', 'AIRTEL_MONEY'].includes(payment.provider)) {
      return res.json({ success: true, data: payment });
    }
    const result = await collectionStatus(payment.provider as Provider, payment.externalRef);
    if (result.status === 'SUCCESSFUL') await markPaid(payment.orderId, payment.id);
    else if (result.status === 'FAILED') await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', message: result.message } });
    res.json({ success: true, data: await prisma.payment.findUnique({ where: { id: payment.id } }) });
  } catch (error) {
    next(error);
  }
});

/** Record a cash or bank payment received by staff or the driver. */
router.post('/payments/manual', auth, async (req, res, next) => {
  try {
    const { orderId, provider = 'CASH', amount, reference } = req.body || {};
    if (!['CASH', 'BANK_TRANSFER', 'CARD'].includes(provider)) return bad(res, 'provider must be CASH, BANK_TRANSFER or CARD');
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(orderId) } });
    if (!order) return bad(res, 'Order not found', 404);
    if (req.user!.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { userId: Number(req.user!.userId) }, select: { id: true } });
      if (!driver || order.driverId !== driver.id) return bad(res, 'Order not found', 404);
    }
    if (order.paymentStatus === 'PAID') return bad(res, 'This order is already paid');
    const payment = await prisma.payment.create({
      data: { orderId: order.id, provider, amount: amount ? Number(amount) : Number(order.totalAmount), status: 'PENDING', externalRef: reference || null },
    });
    await markPaid(order.id, payment.id);
    res.status(201).json({ success: true, data: await prisma.payment.findUnique({ where: { id: payment.id } }) });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

router.get('/invoices', ...staff, async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 500,
      include: { order: { select: { orderNumber: true, customerName: true, paymentMethod: true } } },
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
});

/** Invoice for an order (created on first request), with everything needed to print it. */
router.get('/invoices/order/:orderId', ...staff, async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { where: { status: 'SUCCESSFUL' }, orderBy: { completedAt: 'desc' } } },
    });
    if (!order) return bad(res, 'Order not found', 404);
    let invoice = await prisma.invoice.findUnique({ where: { orderId } });
    if (!invoice) {
      const subtotal = Number(order.totalAmount);
      const tax = Math.round(subtotal * VAT);
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${String(order.id).padStart(6, '0')}`, orderId, subtotal, tax, total: subtotal + tax,
          status: order.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID', dueDate: new Date(Date.now() + 14 * 86400000),
          paidAt: order.paymentStatus === 'PAID' ? new Date() : null,
        },
      });
    }
    res.json({
      success: true,
      data: {
        invoice,
        order: {
          orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail, contactNumber: order.contactNumber,
          deliveryAddress: order.deliveryAddress, paymentMethod: order.paymentMethod, createdAt: order.createdAt, deliveredAt: order.deliveredAt,
          items: order.items.map((i) => ({ name: i.itemName, quantity: i.quantity, unit: i.unit, unitPrice: Number(i.unitPrice), total: Number(i.totalPrice) })),
        },
        payments: order.payments,
        vatRate: VAT,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
