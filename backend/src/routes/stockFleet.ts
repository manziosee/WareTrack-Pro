import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { tenantFields } from '../lib/tenantContext';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { storeDataUrl, FileInputError } from '../services/fileStorage';

/**
 * Serial numbers, lead-time reorder points, vehicle documents and fuel
 * efficiency. Mounted at /api.
 */
const router = Router();
const stock = [auth, authorizeRoles(...ROLES.inventoryManagers)];
const fleet = [auth, authorizeRoles(...ROLES.fleetManagers)];
const DAY = 86400000;

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR', message } });

// ===========================================================================
// Serial numbers
// ===========================================================================

/**
 * @swagger
 * /api/inventory/{id}/serials:
 *   get:
 *     tags: [Serial Numbers]
 *     summary: Serial numbers of an item and their status
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Serials } }
 *   post:
 *     tags: [Serial Numbers]
 *     summary: Register serial numbers received into stock
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { serialNumbers: { type: array, items: { type: string } } } }
 *     responses: { 201: { description: Added (duplicates are reported) } }
 */
router.get('/inventory/:id/serials', auth, async (req, res, next) => {
  try {
    const serials = await prisma.itemSerial.findMany({ where: { itemId: Number(req.params.id) }, orderBy: [{ status: 'asc' }, { serialNumber: 'asc' }], take: 2000 });
    const counts = serials.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
    res.json({ success: true, data: serials, counts });
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/:id/serials', ...stock, async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return bad(res, 'Item not found', 404);
    const list: string[] = (Array.isArray(req.body?.serialNumbers) ? req.body.serialNumbers : String(req.body?.serialNumbers || '').split(/[\s,;]+/))
      .map((s: string) => String(s).trim()).filter(Boolean).slice(0, 2000);
    if (!list.length) return bad(res, 'Give at least one serial number');
    const added: string[] = [];
    const duplicates: string[] = [];
    for (const serialNumber of [...new Set(list)]) {
      try {
        await prisma.itemSerial.create({ data: { ...tenantFields(), itemId: item.id, serialNumber } });
        added.push(serialNumber);
      } catch (error: any) {
        if (error?.code === 'P2002') duplicates.push(serialNumber);
        else throw error;
      }
    }
    if (added.length && !item.trackSerials) await prisma.inventoryItem.update({ where: { id: item.id }, data: { trackSerials: true } });
    res.status(201).json({ success: true, data: { added: added.length, duplicates } });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/serials/{serialNumber}:
 *   get:
 *     tags: [Serial Numbers]
 *     summary: Look up a serial number (warranty / returns) - which item, its status and the order it was sold on
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: serialNumber, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Serial }, 404: { description: Unknown serial } }
 */
router.get('/serials/:serialNumber', auth, async (req, res, next) => {
  try {
    const serial = await prisma.itemSerial.findFirst({
      where: { serialNumber: { equals: String(req.params.serialNumber).trim(), mode: 'insensitive' } },
      include: { item: { select: { id: true, name: true, code: true } } },
    });
    if (!serial) return bad(res, 'Serial number not found', 404);
    const order = serial.orderId ? await prisma.deliveryOrder.findUnique({ where: { id: serial.orderId }, select: { id: true, orderNumber: true, customerName: true, deliveredAt: true } }) : null;
    res.json({ success: true, data: { ...serial, order } });
  } catch (error) {
    next(error);
  }
});

router.put('/serials/:id', ...stock, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED'].includes(status)) return bad(res, 'Status must be IN_STOCK, SOLD, RETURNED or DAMAGED');
    res.json({ success: true, data: await prisma.itemSerial.update({ where: { id: Number(req.params.id) }, data: { status, ...(status === 'IN_STOCK' && { orderId: null, soldAt: null }) } }) });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Serial not found', 404);
    next(error);
  }
});

// ===========================================================================
// Reorder points from demand and supplier lead time
// ===========================================================================

const SAFETY_DAYS = 3;

/** Suggested minimum stock = daily demand × (supplier lead time + safety days). */
async function reorderSuggestions() {
  const since = new Date(Date.now() - 60 * DAY);
  const [items, suppliers, sold] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, code: true, unit: true, quantity: true, minQuantity: true, supplier: true } }),
    prisma.supplier.findMany({ where: { active: true }, select: { name: true, leadTimeDays: true } }),
    prisma.orderItem.groupBy({ by: ['itemId'], where: { order: { createdAt: { gte: since }, status: { notIn: ['CANCELLED'] } } }, _sum: { quantity: true } }),
  ]);
  const leadTime = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.leadTimeDays]));
  const demand = new Map(sold.map((s) => [s.itemId, Number(s._sum.quantity || 0)]));
  return items.map((item) => {
    const perDay = (demand.get(item.id) || 0) / 60;
    const lead = leadTime.get(String(item.supplier || '').trim().toLowerCase()) ?? 7;
    const suggested = Math.ceil(perDay * (lead + SAFETY_DAYS));
    return {
      ...item,
      dailyDemand: Math.round(perDay * 100) / 100,
      leadTimeDays: lead,
      suggestedMinimum: suggested,
      daysOfStock: perDay > 0 ? Math.floor(item.quantity / perDay) : null,
      change: suggested - item.minQuantity,
      atRisk: perDay > 0 && item.quantity / perDay < lead,
    };
  }).sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || Math.abs(b.change) - Math.abs(a.change));
}

/**
 * @swagger
 * /api/reorder-points:
 *   get:
 *     tags: [Inventory]
 *     summary: Suggested minimum stock per item from the last 60 days of demand and the supplier's lead time
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Suggestions; atRisk means stock runs out before a new delivery could arrive } }
 *   post:
 *     tags: [Inventory]
 *     summary: Apply the suggested minimums (all items, or the given itemIds)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { itemIds: { type: array, items: { type: integer } } } }
 *     responses: { 200: { description: Number of items updated } }
 */
router.get('/reorder-points', ...stock, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await reorderSuggestions(), safetyDays: SAFETY_DAYS });
  } catch (error) {
    next(error);
  }
});

router.post('/reorder-points', ...stock, async (req, res, next) => {
  try {
    const only = Array.isArray(req.body?.itemIds) ? new Set(req.body.itemIds.map(Number)) : null;
    let updated = 0;
    for (const s of await reorderSuggestions()) {
      if ((only && !only.has(s.id)) || s.change === 0 || s.dailyDemand === 0) continue;
      await prisma.inventoryItem.update({ where: { id: s.id }, data: { minQuantity: s.suggestedMinimum } });
      updated += 1;
    }
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Vehicle documents and reminders
// ===========================================================================

const DOC_TYPES = ['INSURANCE', 'INSPECTION', 'REGISTRATION', 'PERMIT', 'OTHER'];

/**
 * @swagger
 * /api/vehicles/{id}/documents:
 *   get:
 *     tags: [Fleet]
 *     summary: Insurance, inspection and other documents of a vehicle
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Documents } }
 *   post:
 *     tags: [Fleet]
 *     summary: Add a document with its expiry date (and optional scan)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, expiresAt]
 *             properties:
 *               type: { type: string, enum: [INSURANCE, INSPECTION, REGISTRATION, PERMIT, OTHER] }
 *               number: { type: string }
 *               provider: { type: string }
 *               issuedAt: { type: string, format: date }
 *               expiresAt: { type: string, format: date }
 *               file: { type: string, description: Data URL of a photo or PDF }
 *     responses: { 201: { description: Added } }
 */
router.get('/vehicles/:id/documents', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.vehicleDocument.findMany({ where: { vehicleId: Number(req.params.id) }, orderBy: { expiresAt: 'asc' } }) });
  } catch (error) {
    next(error);
  }
});

router.post('/vehicles/:id/documents', ...fleet, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(req.params.id) } });
    if (!vehicle) return bad(res, 'Vehicle not found', 404);
    const type = String(req.body?.type || '').toUpperCase();
    if (!DOC_TYPES.includes(type)) return bad(res, `Type must be one of ${DOC_TYPES.join(', ')}`);
    if (!req.body?.expiresAt || Number.isNaN(Date.parse(req.body.expiresAt))) return bad(res, 'Give the expiry date');
    let fileRef: string | null = null;
    try {
      fileRef = await storeDataUrl(req.body?.file, 'vehicle-document', { maxBytes: 3_000_000, createdById: Number(req.user!.userId) });
    } catch (error) {
      if (error instanceof FileInputError) return bad(res, error.message);
      throw error;
    }
    const doc = await prisma.vehicleDocument.create({
      data: {
        ...tenantFields(), vehicleId: vehicle.id, type, number: req.body?.number ? String(req.body.number).slice(0, 60) : null,
        provider: req.body?.provider ? String(req.body.provider).slice(0, 80) : null, issuedAt: req.body?.issuedAt ? new Date(req.body.issuedAt) : null,
        expiresAt: new Date(req.body.expiresAt), fileRef, notes: req.body?.notes ? String(req.body.notes).slice(0, 300) : null,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

router.delete('/vehicles/:id/documents/:docId', ...fleet, async (req, res, next) => {
  try {
    const { count } = await prisma.vehicleDocument.deleteMany({ where: { id: Number(req.params.docId), vehicleId: Number(req.params.id) } });
    if (!count) return bad(res, 'Document not found', 404);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Vehicle documents and driver licences that expire soon (or already have). */
export async function expiringDocuments(withinDays = 30) {
  const until = new Date(Date.now() + withinDays * DAY);
  const [docs, licences] = await Promise.all([
    prisma.vehicleDocument.findMany({ where: { expiresAt: { lte: until } }, orderBy: { expiresAt: 'asc' }, include: { vehicle: { select: { id: true, plateNumber: true } } } }),
    prisma.driver.findMany({ where: { licenseExpiry: { lte: until } }, orderBy: { licenseExpiry: 'asc' }, select: { id: true, name: true, licenseNumber: true, licenseExpiry: true } }),
  ]);
  const daysLeft = (d: Date) => Math.ceil((d.getTime() - Date.now()) / DAY);
  return [
    ...docs.map((d) => ({ kind: 'vehicle' as const, id: d.id, vehicleId: d.vehicle.id, name: `${d.vehicle.plateNumber} ${d.type.toLowerCase()}`, number: d.number, expiresAt: d.expiresAt, daysLeft: daysLeft(d.expiresAt) })),
    ...licences.map((l) => ({ kind: 'licence' as const, id: l.id, driverId: l.id, name: `${l.name} driving licence`, number: l.licenseNumber, expiresAt: l.licenseExpiry!, daysLeft: daysLeft(l.licenseExpiry!) })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * @swagger
 * /api/fleet/expiring-documents:
 *   get:
 *     tags: [Fleet]
 *     summary: Vehicle documents and driver licences expiring within N days (default 30), including expired ones
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: days, schema: { type: integer } }]
 *     responses: { 200: { description: Expiring documents, soonest first } }
 */
router.get('/fleet/expiring-documents', ...fleet, async (req, res, next) => {
  try {
    res.json({ success: true, data: await expiringDocuments(Math.min(365, Math.max(1, Number(req.query.days) || 30))) });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Fuel efficiency
// ===========================================================================

/**
 * @swagger
 * /api/fleet/fuel-efficiency:
 *   get:
 *     tags: [Fleet]
 *     summary: Km per litre and fuel cost per km for each vehicle, from fuel expenses with odometer readings
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: One row per vehicle with enough readings } }
 */
router.get('/fleet/fuel-efficiency', ...fleet, async (_req, res, next) => {
  try {
    const fills = await prisma.expense.findMany({
      where: { type: 'FUEL', status: { not: 'REJECTED' }, vehicleId: { not: null }, odometer: { not: null }, liters: { not: null } },
      orderBy: [{ vehicleId: 'asc' }, { odometer: 'asc' }],
      select: { vehicleId: true, odometer: true, liters: true, amount: true, spentAt: true, vehicle: { select: { plateNumber: true, type: true } } },
    });
    const byVehicle = new Map<number, typeof fills>();
    for (const f of fills) byVehicle.set(f.vehicleId!, [...(byVehicle.get(f.vehicleId!) || []), f]);
    const rows = [];
    for (const [vehicleId, list] of byVehicle) {
      if (list.length < 2) {
        rows.push({ vehicleId, plateNumber: list[0].vehicle!.plateNumber, type: list[0].vehicle!.type, fills: list.length, km: 0, liters: 0, kmPerLiter: null, costPerKm: null, note: 'Needs at least two fuel entries with odometer readings' });
        continue;
      }
      // Fuel bought after the first fill was used to drive from the first to the last reading
      const km = list[list.length - 1].odometer! - list[0].odometer!;
      const used = list.slice(1);
      const liters = used.reduce((s, f) => s + Number(f.liters), 0);
      const cost = used.reduce((s, f) => s + Number(f.amount), 0);
      rows.push({
        vehicleId, plateNumber: list[0].vehicle!.plateNumber, type: list[0].vehicle!.type, fills: list.length, km, liters: Math.round(liters * 10) / 10,
        kmPerLiter: liters > 0 && km > 0 ? Math.round((km / liters) * 10) / 10 : null,
        costPerKm: km > 0 ? Math.round(cost / km) : null,
        from: list[0].spentAt, to: list[list.length - 1].spentAt,
      });
    }
    res.json({ success: true, data: rows.sort((a, b) => (a.kmPerLiter ?? 999) - (b.kmPerLiter ?? 999)) });
  } catch (error) {
    next(error);
  }
});

export default router;
