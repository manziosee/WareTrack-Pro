import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { tenantFields, getTenantContext } from '../lib/tenantContext';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { priceLine } from '../services/pricing';
import { issueCreditNote, refreshOrderPayment } from '../services/finance';

/**
 * Pricing (price lists, promotions, quotes) and credit notes. Mounted at /api.
 */
const router = Router();
const staff = [auth, authorizeRoles(...ROLES.orderManagers)];
const admin = [auth, authorizeRoles(...ROLES.admin)];

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR', message } });
const money = (v: unknown) => Math.round(Number(v || 0) * 100) / 100;

// ===========================================================================
// Price lists
// ===========================================================================

/**
 * @swagger
 * /api/price-lists:
 *   get:
 *     tags: [Pricing]
 *     summary: Price lists with how many items and customers use each
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Price lists } }
 *   post:
 *     tags: [Pricing]
 *     summary: Create a price list (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name], properties: { name: { type: string }, description: { type: string } } }
 *     responses: { 201: { description: Created } }
 */
router.get('/price-lists', ...staff, async (_req, res, next) => {
  try {
    const lists = await prisma.priceList.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { items: true, accounts: true } } } });
    res.json({ success: true, data: lists });
  } catch (error) {
    next(error);
  }
});

router.get('/price-lists/:id', ...staff, async (req, res, next) => {
  try {
    const list = await prisma.priceList.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        items: { include: { item: { select: { id: true, name: true, code: true, unit: true, unitPrice: true } } }, orderBy: { item: { name: 'asc' } } },
        accounts: { select: { id: true, name: true, accountNumber: true } },
      },
    });
    if (!list) return bad(res, 'Price list not found', 404);
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.post('/price-lists', ...admin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    if (!name) return bad(res, 'Give the price list a name, e.g. "Supermarkets"');
    const list = await prisma.priceList.create({ data: { ...tenantFields(), branchId: null, name, description: req.body?.description ? String(req.body.description).slice(0, 300) : null } });
    res.status(201).json({ success: true, data: list });
  } catch (error: any) {
    if (error?.code === 'P2002') return bad(res, 'A price list with that name already exists', 409);
    next(error);
  }
});

router.put('/price-lists/:id', ...admin, async (req, res, next) => {
  try {
    const data: any = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name).trim().slice(0, 80);
    if (req.body?.description !== undefined) data.description = req.body.description ? String(req.body.description).slice(0, 300) : null;
    if (req.body?.active !== undefined) data.active = Boolean(req.body.active);
    res.json({ success: true, data: await prisma.priceList.update({ where: { id: Number(req.params.id) }, data }) });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Price list not found', 404);
    next(error);
  }
});

/**
 * @swagger
 * /api/price-lists/{id}/items:
 *   put:
 *     tags: [Pricing]
 *     summary: Set item prices on a price list (admin). A null price removes the item.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { items: { type: array, items: { type: object, properties: { itemId: { type: integer }, price: { type: number, nullable: true } } } } } }
 *     responses: { 200: { description: Updated } }
 */
router.put('/price-lists/:id/items', ...admin, async (req, res, next) => {
  try {
    const list = await prisma.priceList.findUnique({ where: { id: Number(req.params.id) } });
    if (!list) return bad(res, 'Price list not found', 404);
    const items: { itemId: number; price: number | null }[] = Array.isArray(req.body?.items) ? req.body.items.slice(0, 2000) : [];
    let saved = 0;
    let removed = 0;
    for (const entry of items) {
      const itemId = Number(entry.itemId);
      const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) continue;
      if (entry.price === null || entry.price === undefined || (entry.price as any) === '') {
        removed += (await prisma.priceListItem.deleteMany({ where: { priceListId: list.id, itemId } })).count;
        continue;
      }
      const price = money(entry.price);
      if (!(price >= 0)) return bad(res, 'Prices must be 0 or more');
      await prisma.priceListItem.upsert({
        where: { priceListId_itemId: { priceListId: list.id, itemId } },
        update: { price },
        create: { ...tenantFields(), branchId: null, priceListId: list.id, itemId, price },
      });
      saved += 1;
    }
    res.json({ success: true, data: { saved, removed } });
  } catch (error) {
    next(error);
  }
});

router.delete('/price-lists/:id', ...admin, async (req, res, next) => {
  try {
    await prisma.priceList.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Price list not found', 404);
    next(error);
  }
});

// ===========================================================================
// Promotions
// ===========================================================================

function promotionData(body: any) {
  const type = String(body?.type || '').toUpperCase();
  return {
    name: body?.name !== undefined ? String(body.name).trim().slice(0, 80) : undefined,
    type: body?.type !== undefined ? type : undefined,
    value: body?.value !== undefined ? money(body.value) : undefined,
    itemId: body?.itemId !== undefined ? (body.itemId ? Number(body.itemId) : null) : undefined,
    category: body?.category !== undefined ? (body.category ? String(body.category) : null) : undefined,
    minQuantity: body?.minQuantity !== undefined ? Math.max(1, Math.round(Number(body.minQuantity) || 1)) : undefined,
    startsAt: body?.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body?.endsAt ? new Date(body.endsAt) : undefined,
    active: body?.active !== undefined ? Boolean(body.active) : undefined,
  };
}

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     tags: [Pricing]
 *     summary: Promotions (running, upcoming and ended)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Promotions } }
 *   post:
 *     tags: [Pricing]
 *     summary: Create a promotion (admin) on one item or a whole category
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, value, startsAt, endsAt]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [PERCENT, AMOUNT] }
 *               value: { type: number, description: Percent off, or RWF off per unit }
 *               itemId: { type: integer }
 *               category: { type: string }
 *               minQuantity: { type: integer }
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *     responses: { 201: { description: Created } }
 */
router.get('/promotions', ...staff, async (_req, res, next) => {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: [{ active: 'desc' }, { endsAt: 'desc' }], include: { item: { select: { id: true, name: true, code: true } } } });
    const now = Date.now();
    res.json({
      success: true,
      data: promotions.map((p) => ({ ...p, state: !p.active ? 'OFF' : p.endsAt.getTime() < now ? 'ENDED' : p.startsAt.getTime() > now ? 'UPCOMING' : 'RUNNING' })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/promotions', ...admin, async (req, res, next) => {
  try {
    const data = promotionData(req.body);
    if (!data.name) return bad(res, 'Give the promotion a name');
    if (!['PERCENT', 'AMOUNT'].includes(String(data.type))) return bad(res, 'Type must be PERCENT or AMOUNT');
    if (!(Number(data.value) > 0) || (data.type === 'PERCENT' && Number(data.value) > 100)) return bad(res, 'Give a discount: 1–100 percent, or an amount in RWF');
    if (!data.itemId && !data.category) return bad(res, 'Choose an item or a category');
    if (!data.startsAt || !data.endsAt || data.endsAt <= data.startsAt) return bad(res, 'The end date must be after the start date');
    if (data.itemId && !(await prisma.inventoryItem.findUnique({ where: { id: data.itemId } }))) return bad(res, 'Item not found', 404);
    const promotion = await prisma.promotion.create({ data: { ...tenantFields(), branchId: null, ...(data as any), active: data.active ?? true } });
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
});

router.put('/promotions/:id', ...admin, async (req, res, next) => {
  try {
    const data = promotionData(req.body);
    res.json({ success: true, data: await prisma.promotion.update({ where: { id: Number(req.params.id) }, data: data as any }) });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Promotion not found', 404);
    next(error);
  }
});

router.delete('/promotions/:id', ...admin, async (req, res, next) => {
  try {
    await prisma.promotion.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Promotion not found', 404);
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing/quote:
 *   post:
 *     tags: [Pricing]
 *     summary: Prices a customer would pay (price list, promotions, discount) before creating an order
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountId: { type: integer }
 *               items: { type: array, items: { type: object, properties: { itemId: { type: integer }, packagingId: { type: integer }, quantity: { type: number } } } }
 *     responses: { 200: { description: One priced line per item, and the total } }
 */
router.post('/pricing/quote', ...staff, async (req, res, next) => {
  try {
    const account = req.body?.accountId ? await prisma.customerAccount.findUnique({ where: { id: Number(req.body.accountId) } }) : null;
    const tenant = getTenantContext();
    const company = tenant ? await prisma.company.findUnique({ where: { id: tenant.companyId }, select: { taxRate: true } }) : null;
    const lines = [];
    for (const raw of (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 200)) {
      const item = await prisma.inventoryItem.findUnique({ where: { id: Number(raw.itemId) } });
      if (!item) continue;
      const pack = raw.packagingId ? await prisma.itemPackaging.findFirst({ where: { id: Number(raw.packagingId), itemId: item.id } }) : null;
      const quantity = Math.max(1, Number(raw.quantity) || 1);
      const price = await priceLine({ item, pack, quantity, account, companyTaxRate: company ? Number(company.taxRate) : 0.18 });
      lines.push({ itemId: item.id, packagingId: pack?.id ?? null, quantity, ...price, total: money(price.unitPrice * quantity) });
    }
    res.json({ success: true, data: { lines, total: money(lines.reduce((s, l) => s + l.total, 0)), discount: money(lines.reduce((s, l) => s + l.discount * l.quantity, 0)) } });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Credit notes
// ===========================================================================

/**
 * @swagger
 * /api/credit-notes:
 *   get:
 *     tags: [Credit Notes]
 *     summary: Credit notes, newest first
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Credit notes } }
 *   post:
 *     tags: [Credit Notes]
 *     summary: Issue a credit note on an order (admin)
 *     description: It settles what the order still owes; the rest stays as account credit (ACCOUNT_CREDIT) or is noted as cash handed back (CASH_REFUND).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, reason]
 *             properties:
 *               orderId: { type: integer }
 *               amount: { type: number }
 *               reason: { type: string }
 *               settlement: { type: string, enum: [ACCOUNT_CREDIT, CASH_REFUND] }
 *     responses: { 201: { description: Issued } }
 */
router.get('/credit-notes', ...staff, async (req, res, next) => {
  try {
    const notes = await prisma.creditNote.findMany({
      where: req.query.accountId ? { accountId: Number(req.query.accountId) } : {},
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { order: { select: { id: true, orderNumber: true, customerName: true } }, account: { select: { id: true, name: true, accountNumber: true } } },
    });
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
});

router.post('/credit-notes', ...admin, async (req, res, next) => {
  try {
    const { orderId, amount, reason, settlement } = req.body || {};
    if (!orderId || !reason) return bad(res, 'Order and reason are required');
    const note = await issueCreditNote({
      orderId: Number(orderId), amount: Number(amount), reason: String(reason), userId: Number(req.user!.userId),
      settlement: settlement === 'CASH_REFUND' ? 'CASH_REFUND' : settlement === 'ACCOUNT_CREDIT' ? 'ACCOUNT_CREDIT' : undefined,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Cancel a credit note issued by mistake: the order owes again what it settled. */
router.post('/credit-notes/:id/void', ...admin, async (req, res, next) => {
  try {
    const note = await prisma.creditNote.findUnique({ where: { id: Number(req.params.id) } });
    if (!note) return bad(res, 'Credit note not found', 404);
    if (note.status === 'VOID') return bad(res, 'Already void', 409);
    await prisma.payment.deleteMany({ where: { orderId: note.orderId, provider: 'CREDIT_NOTE', externalRef: note.creditNoteNumber } });
    const voided = await prisma.creditNote.update({ where: { id: note.id }, data: { status: 'VOID' } });
    await refreshOrderPayment(note.orderId);
    res.json({ success: true, data: voided });
  } catch (error) {
    next(error);
  }
});

export default router;
