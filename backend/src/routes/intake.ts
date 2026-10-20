import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { publicKey, pushToUsers, saveSubscription } from '../services/push';
import { getSetting, setSetting, ONLINE_ORDERING_DEFAULTS, type OnlineOrdering } from '../services/appSettings';
import { accountForCustomer, createOrderRecord, OrderInputError } from '../services/orderCreation';
import { NotificationService } from '../services/notificationService';
import { publicTenant } from '../middleware/publicTenant';
import { runWithTenant } from '../lib/tenantContext';

/**
 * Ways in: push notifications, API keys + order API for clients' systems,
 * and the public online order page. Mounted at /api.
 */
const router = Router();
const admin = [auth, authorizeRoles(...ROLES.admin)];

const bad = (res: Response, message: string, status = 400, code?: string) =>
  res.status(status).json({ success: false, error: { code: code || (status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHORIZED' : 'VALIDATION_ERROR'), message } });
const hash = (key: string) => crypto.createHash('sha256').update(key).digest('hex');

// ===========================================================================
// Push notifications
// ===========================================================================

router.get('/push/public-key', auth, async (_req, res, next) => {
  try {
    res.json({ success: true, data: { publicKey: await publicKey() } });
  } catch (error) {
    next(error);
  }
});

router.post('/push/subscribe', auth, async (req, res, next) => {
  try {
    await saveSubscription(Number(req.user!.userId), req.body?.subscription || req.body, req.headers['user-agent']);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

router.post('/push/unsubscribe', auth, async (req, res, next) => {
  try {
    if (req.body?.endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: String(req.body.endpoint), userId: Number(req.user!.userId) } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/push/test', auth, async (req, res, next) => {
  try {
    const sent = await pushToUsers([Number(req.user!.userId)], { title: 'WareTrack Pro', body: 'Phone notifications are working 🎉', url: '/notifications', tag: 'test' });
    if (!sent) return bad(res, 'No device is registered for notifications yet');
    res.json({ success: true, data: { sent } });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// API keys (admin) and the order API
// ===========================================================================

router.get('/api-keys', ...admin, async (_req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true } });
    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
});

/** Create a key. The full key is returned once and never stored. */
router.post('/api-keys', ...admin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) return bad(res, 'Give the key a name, e.g. "Online shop"');
    const key = `wtp_live_${crypto.randomBytes(24).toString('base64url')}`;
    const row = await prisma.apiKey.create({ data: { name, prefix: key.slice(0, 14), keyHash: hash(key), createdById: Number(req.user!.userId) } });
    res.status(201).json({ success: true, data: { id: row.id, name: row.name, prefix: row.prefix, key } });
  } catch (error) {
    next(error);
  }
});

router.delete('/api-keys/:id', ...admin, async (req, res, next) => {
  try {
    await prisma.apiKey.update({ where: { id: Number(req.params.id) }, data: { revokedAt: new Date() } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Key not found', 404);
    next(error);
  }
});

const intakeLimit = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = String(req.headers['x-api-key'] || '').trim();
  if (!key) return bad(res, 'Send your API key in the X-API-Key header', 401);
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hash(key) } });
  if (!row || row.revokedAt) return bad(res, 'Invalid or revoked API key', 401);
  (req as any).apiKey = row;
  runWithTenant({ companyId: row.companyId, branchId: row.branchId }, () => {
    prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    next();
  });
}

/** Products and prices a connected system can order. */
router.get('/intake/catalog', intakeLimit, apiKeyAuth, async (_req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { code: true, name: true, category: true, unit: true, unitPrice: true, quantity: true, packagings: { select: { id: true, name: true, unitsPerPack: true, price: true } } },
    });
    res.json({ success: true, data: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), inStock: i.quantity > 0 })) });
  } catch (error) {
    next(error);
  }
});

/**
 * Create an order from another system.
 * Body: { customerName, contactNumber, deliveryAddress, items: [{ code, quantity, packagingId? }], paymentMethod?, reference?, ... }
 */
router.post('/intake/orders', intakeLimit, apiKeyAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const key = (req as any).apiKey;
    const account = body.customerName ? await accountForCustomer(String(body.customerName), { phone: body.contactNumber, address: body.deliveryAddress, email: body.customerEmail }) : null;
    const order = await createOrderRecord(
      {
        ...body,
        accountId: account?.id,
        deliveryInstructions: [body.reference ? `Ref ${String(body.reference).slice(0, 40)}` : '', body.deliveryInstructions || ''].filter(Boolean).join(' · ') || null,
        items: (Array.isArray(body.items) ? body.items : []).map((i: any) => ({ code: i.code, itemId: i.itemId, quantity: i.quantity, packagingId: i.packagingId })),
      },
      { createdBy: key.createdById, source: 'API' }
    );
    res.status(201).json({ success: true, data: { orderNumber: order.orderNumber, status: order.status, totalAmount: Number(order.totalAmount), trackingUrl: `${process.env.FRONTEND_URL || ''}/track/${order.orderNumber}` } });
  } catch (error: any) {
    if (error instanceof OrderInputError) return bad(res, error.message, error.status, error.code);
    next(error);
  }
});

// ===========================================================================
// Online ordering page (public)
// ===========================================================================

router.get('/settings/online-ordering', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getSetting<OnlineOrdering>('onlineOrdering', ONLINE_ORDERING_DEFAULTS) });
  } catch (error) {
    next(error);
  }
});

router.put('/settings/online-ordering', ...admin, async (req, res, next) => {
  try {
    const current = await getSetting<OnlineOrdering>('onlineOrdering', ONLINE_ORDERING_DEFAULTS);
    const b = req.body || {};
    const next_: OnlineOrdering = {
      enabled: b.enabled !== undefined ? Boolean(b.enabled) : current.enabled,
      businessName: b.businessName !== undefined ? String(b.businessName).slice(0, 80) : current.businessName,
      phone: b.phone !== undefined ? String(b.phone).slice(0, 30) : current.phone,
      message: b.message !== undefined ? String(b.message).slice(0, 300) : current.message,
      minimumOrder: b.minimumOrder !== undefined ? Math.max(0, Number(b.minimumOrder) || 0) : current.minimumOrder,
    };
    await setSetting('onlineOrdering', next_);
    res.json({ success: true, data: next_ });
  } catch (error) {
    next(error);
  }
});

/** What customers see on /order (only when online ordering is switched on). */
router.get('/public/catalog', publicTenant, async (_req, res, next) => {
  try {
    const settings = await getSetting<OnlineOrdering>('onlineOrdering', ONLINE_ORDERING_DEFAULTS);
    if (!settings.enabled) return bad(res, 'Online ordering is not open right now', 404, 'ORDERING_CLOSED');
    const items = await prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE', quantity: { gt: 0 } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, unit: true, unitPrice: true, description: true, packagings: { select: { id: true, name: true, unitsPerPack: true, price: true } } },
    });
    res.json({
      success: true,
      data: {
        businessName: settings.businessName, phone: settings.phone, message: settings.message, minimumOrder: settings.minimumOrder,
        items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), packagings: i.packagings.map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) })) })),
      },
    });
  } catch (error) {
    next(error);
  }
});

const publicOrderLimit = rateLimit({ windowMs: 60 * 60_000, max: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many orders from this connection. Please call us instead.' } } });

/** A customer places an order from the public page. Staff are told straight away. */
router.post('/public/orders', publicTenant, publicOrderLimit, async (req, res, next) => {
  try {
    const settings = await getSetting<OnlineOrdering>('onlineOrdering', ONLINE_ORDERING_DEFAULTS);
    if (!settings.enabled) return bad(res, 'Online ordering is not open right now', 404, 'ORDERING_CLOSED');
    const b = req.body || {};
    if (b.website) return res.status(201).json({ success: true, data: { orderNumber: 'ORD-RECEIVED' } }); // honeypot for bots
    const phone = String(b.contactNumber || '').replace(/[^\d+]/g, '');
    if (!/^\+?\d{9,13}$/.test(phone)) return bad(res, 'Enter a valid phone number');
    if (!String(b.customerName || '').trim() || !String(b.deliveryAddress || '').trim()) return bad(res, 'Name and delivery address are required');
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i: any) => ({ itemId: i.itemId, quantity: Math.min(1000, Number(i.quantity)), packagingId: i.packagingId || undefined }));
    const account = await accountForCustomer(String(b.customerName).slice(0, 120), { phone, address: String(b.deliveryAddress).slice(0, 240), email: b.customerEmail || null });
    const admin = await prisma.companyMembership.findFirst({ where: { role: 'ADMIN', active: true, user: { status: 'ACTIVE' } }, select: { userId: true } });
    const order = await createOrderRecord(
      {
        customerName: String(b.customerName).slice(0, 120), contactNumber: phone, deliveryAddress: String(b.deliveryAddress).slice(0, 240),
        customerEmail: b.customerEmail || null, deliveryInstructions: b.deliveryInstructions ? String(b.deliveryInstructions).slice(0, 300) : null,
        paymentMethod: ['CASH', 'MTN_MOMO', 'AIRTEL_MONEY'].includes(b.paymentMethod) ? b.paymentMethod : 'CASH',
        accountId: account?.id, items,
      },
      { createdBy: admin?.userId || 1, source: 'ONLINE' }
    );
    if (settings.minimumOrder && Number(order.totalAmount) < settings.minimumOrder) {
      // Too small: keep it but flag it for staff
      await prisma.deliveryOrder.update({ where: { id: order.id }, data: { deliveryInstructions: `${order.deliveryInstructions || ''} [below minimum order]`.trim() } });
    }
    const staff = await prisma.companyMembership.findMany({ where: { role: { in: ['ADMIN', 'DISPATCH_OFFICER', 'WAREHOUSE_STAFF'] }, active: true, user: { status: 'ACTIVE' } }, select: { userId: true } });
    for (const u of staff) {
      NotificationService.createNotification({
        userId: u.userId, type: 'ORDER_UPDATE', severity: 'INFO', title: `New online order ${order.orderNumber}`,
        message: `${order.customerName} ordered RWF ${Number(order.totalAmount).toLocaleString()} online (${order.deliveryAddress}).`,
      }).catch(() => undefined);
    }
    res.status(201).json({ success: true, data: { orderNumber: order.orderNumber, totalAmount: Number(order.totalAmount) } });
  } catch (error: any) {
    if (error instanceof OrderInputError) return bad(res, error.message, error.status, error.code);
    next(error);
  }
});

export default router;
