import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { buildInvoice, InvoiceError } from '../services/invoices';
import { CollectionError, checkMobilePayment, markPaid, requestMobilePayment } from '../services/collections';
import { vatIncluded } from '../services/pricing';
import { refreshOrderPayment } from '../services/finance';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { providerConfigured, requestCollection, collectionStatus, type Provider } from '../services/payments';
import { emitEvent } from '../services/events';

/** Payments (Mobile Money, cash, bank) and invoices. Mounted at /api. */
const router = Router();
const staff = [auth, authorizeRoles(...ROLES.orderManagers)];
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 503 ? 'NOT_CONFIGURED' : 'VALIDATION_ERROR', message } });


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
    res.status(201).json({ success: true, data: await requestMobilePayment(Number(orderId), provider, phoneNumber) });
  } catch (error: any) {
    if (error instanceof CollectionError) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Check a pending Mobile Money payment with the provider. */
router.get('/payments/:id/status', ...staff, async (req, res, next) => {
  try {
    res.json({ success: true, data: await checkMobilePayment(Number(req.params.id)) });
  } catch (error: any) {
    if (error instanceof CollectionError) return bad(res, error.message, error.status);
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
    let collectedByDriverId: number | null = null;
    if (req.user!.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { userId: Number(req.user!.userId) }, select: { id: true } });
      if (!driver || order.driverId !== driver.id) return bad(res, 'Order not found', 404);
      // Cash taken by a driver stays "in hand" until handed in (Cash page)
      if (provider === 'CASH') collectedByDriverId = driver.id;
    }
    if (order.paymentStatus === 'PAID') return bad(res, 'This order is already paid');
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, provider, amount: amount ? Number(amount) : Number(order.totalAmount), status: 'PENDING', externalRef: reference || null,
        accountId: order.accountId, collectedByDriverId, receivedById: collectedByDriverId ? null : Number(req.user!.userId),
      },
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
    res.json({ success: true, data: await buildInvoice(Number(req.params.orderId)) });
  } catch (error: any) {
    if (error instanceof InvoiceError) return bad(res, error.message, error.status);
    next(error);
  }
});

export default router;
