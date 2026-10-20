import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { haversineKm, optimizeRouteByRoad, roadDistancesTo, roadLegs, ROAD_FACTOR, type Point } from '../services/routing';
import { onOrderStatusChanged } from '../services/orderLifecycle';
import { refreshOrderPayment } from '../services/finance';
import { emitEvent } from '../services/events';
import { emitToRoles } from '../services/realtime';
import { publicTenant } from '../middleware/publicTenant';

/** Routing, auto-dispatch, driver workflow, returns and failed deliveries. Mounted at /api. */
const router = Router();
const fleet = [auth, authorizeRoles(...ROLES.fleetManagers)];
const orderStaff = [auth, authorizeRoles(...ROLES.orderManagers)];
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message } });

const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 2, MEDIUM: 1.3, LOW: 1 };
const DEFAULT_DEPOT: Point = { lat: -1.9781, lng: 30.0735 }; // Gikondo

async function depotFor(warehouseId?: number | null): Promise<Point> {
  const w = warehouseId
    ? await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    : await prisma.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' } });
  return w?.latitude && w?.longitude ? { lat: Number(w.latitude), lng: Number(w.longitude) } : DEFAULT_DEPOT;
}

const OPEN = ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] as const;

// ---------------------------------------------------------------------------
// Route optimization
// ---------------------------------------------------------------------------

/** Best order of today's open stops for a driver, with distances and arrival times. */
router.get('/routes/driver/:driverId', auth, async (req, res, next) => {
  try {
    const driverId = Number(req.params.driverId);
    if (req.user!.role === 'DRIVER') {
      const own = await prisma.driver.findUnique({ where: { userId: Number(req.user!.userId) }, select: { id: true } });
      if (own?.id !== driverId) return bad(res, 'Drivers can only see their own route', 403);
    }
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, name: true, currentLat: true, currentLng: true } });
    if (!driver) return bad(res, 'Driver not found', 404);
    const orders: any[] = await prisma.deliveryOrder.findMany({
      where: { driverId, status: { in: ['DISPATCHED', 'IN_TRANSIT'] }, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, orderNumber: true, customerName: true, deliveryAddress: true, contactNumber: true, priority: true, status: true, latitude: true, longitude: true, slaDeadline: true, timeSlotStart: true, timeSlotEnd: true, warehouseId: true },
    });
    const start = driver.currentLat && driver.currentLng ? { lat: Number(driver.currentLat), lng: Number(driver.currentLng) } : await depotFor(orders[0]?.warehouseId);
    const stops = orders.map((o) => ({ ...o, lat: Number(o.latitude), lng: Number(o.longitude), priorityWeight: PRIORITY_WEIGHT[o.priority] || 1, deadline: o.slaDeadline }));

    const bySlot = [...stops].sort((a, b) => (a.timeSlotStart?.getTime() || 0) - (b.timeSlotStart?.getTime() || 0));
    const ordered = await optimizeRouteByRoad(start, stops);
    // Road distances and the road path when the routing service answers; estimates otherwise
    const [best, naive] = await Promise.all([roadLegs(start, ordered.route), roadLegs(start, bySlot)]);
    res.json({
      success: true,
      data: {
        driver: { id: driver.id, name: driver.name },
        start,
        totalKm: best.totalKm,
        totalMinutes: best.totalMinutes,
        savedKm: Math.max(0, Math.round((naive.totalKm - best.totalKm) * 10) / 10),
        distanceSource: best.source,
        line: best.line,
        stops: best.legs.map((l, i) => ({
          sequence: i + 1, id: l.stop.id, orderNumber: l.stop.orderNumber, customerName: l.stop.customerName, address: l.stop.deliveryAddress,
          phone: l.stop.contactNumber, priority: l.stop.priority, status: l.stop.status, lat: l.stop.lat, lng: l.stop.lng,
          km: l.km, driveMinutes: l.driveMinutes, eta: l.eta, late: l.late, slotStart: l.stop.timeSlotStart, slotEnd: l.stop.timeSlotEnd,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Auto-dispatch
// ---------------------------------------------------------------------------

/** Ranked driver + vehicle suggestions for an order. */
async function suggestFor(orderId: number) {
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { item: { select: { unit: true, unitCategory: true } } } } },
  });
  if (!order) return null;
  // Rough load estimate: weight-based units count as kg-ish bags, everything else ~5 kg per unit
  const loadKg = order.items.reduce((s, l) => s + l.quantity * (l.item.unitCategory === 'weight' ? 25 : 5), 0);
  const destination = order.latitude && order.longitude ? { lat: Number(order.latitude), lng: Number(order.longitude) } : null;

  const [drivers, vehicles, workload] = await Promise.all([
    prisma.driver.findMany({ where: { status: { in: ['AVAILABLE', 'ON_DUTY'] } }, select: { id: true, name: true, status: true, rating: true, currentLat: true, currentLng: true, currentVehicleId: true } }),
    prisma.vehicle.findMany({ where: { status: 'AVAILABLE' }, select: { id: true, plateNumber: true, type: true, capacity: true } }),
    prisma.deliveryOrder.groupBy({ by: ['driverId'], where: { status: { in: ['DISPATCHED', 'IN_TRANSIT'] }, driverId: { not: null } }, _count: { _all: true } }),
  ]);
  const load = new Map(workload.map((w) => [w.driverId, w._count._all]));
  const depot = await depotFor(order.warehouseId);
  const fitting = vehicles.filter((v) => v.capacity >= loadKg).sort((a, b) => a.capacity - b.capacity);

  // Real road distance from each driver to the customer when available
  const positions = drivers.map((d) => (d.currentLat && d.currentLng ? { lat: Number(d.currentLat), lng: Number(d.currentLng) } : depot));
  const road = destination ? await roadDistancesTo(positions, destination) : null;

  const ranked = drivers
    .map((d, i) => {
      const pos = positions[i];
      const km = road?.[i]?.km ?? (destination ? haversineKm(pos, destination) : haversineKm(pos, depot)) * ROAD_FACTOR;
      const jobs = load.get(d.id) || 0;
      const vehicle = fitting.find((v) => v.id === d.currentVehicleId) || fitting[0] || null;
      // Lower is better: distance, current jobs, and a small bonus for rating and being free
      const score = km * 1.0 + jobs * 4 - (Number(d.rating) || 4) * 0.8 + (d.status === 'AVAILABLE' ? 0 : 3) + (vehicle ? 0 : 50);
      const reasons = [
        `${Math.round(km * 10) / 10} km ${road ? 'by road' : 'away'}`,
        jobs ? `${jobs} active deliver${jobs === 1 ? 'y' : 'ies'}` : 'no active deliveries',
        d.rating ? `rated ${Number(d.rating).toFixed(1)}★` : null,
        vehicle ? `${vehicle.plateNumber} fits ~${loadKg} kg` : 'no free vehicle large enough',
      ].filter(Boolean);
      return { driver: { id: d.id, name: d.name, status: d.status }, vehicle, score: Math.round(score * 10) / 10, distanceKm: Math.round(km * 10) / 10, activeJobs: jobs, reasons };
    })
    .sort((a, b) => a.score - b.score);

  return { order: { id: order.id, orderNumber: order.orderNumber, status: order.status, estimatedLoadKg: loadKg }, suggestions: ranked.slice(0, 5) };
}

router.get('/dispatch-suggestions/:orderId', ...fleet, async (req, res, next) => {
  try {
    const result = await suggestFor(Number(req.params.orderId));
    if (!result) return bad(res, 'Order not found', 404);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/** Dispatch an order to the top suggestion (or the chosen driver/vehicle). */
router.post('/auto-dispatch/:orderId', ...fleet, async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId } });
    if (!order) return bad(res, 'Order not found', 404);
    if (order.status !== 'PENDING') return bad(res, 'Only pending orders can be dispatched');
    let driverId = num(req.body?.driverId);
    let vehicleId = num(req.body?.vehicleId);
    if (!driverId || !vehicleId) {
      const result = await suggestFor(orderId);
      const top = result?.suggestions.find((s) => s.vehicle);
      if (!top) return bad(res, 'No available driver with a suitable vehicle right now', 409);
      driverId = top.driver.id;
      vehicleId = top.vehicle!.id;
    }
    const scheduledDate = order.timeSlotStart || order.scheduledDate || new Date();
    const dispatch = await prisma.$transaction(async (tx) => {
      const d = await tx.dispatch.create({
        data: {
          orderId, driverId: driverId!, vehicleId: vehicleId!, scheduledDate, dispatchedAt: new Date(),
          estimatedDelivery: order.timeSlotEnd || new Date(scheduledDate.getTime() + 2 * 3600000),
          status: 'DISPATCHED', createdBy: Number(req.user!.userId), notes: 'Auto-dispatched',
        },
        include: { driver: { select: { name: true, userId: true } }, vehicle: { select: { plateNumber: true } } },
      });
      await tx.deliveryOrder.update({ where: { id: orderId }, data: { status: 'DISPATCHED', driverId: driverId!, vehicleId: vehicleId! } });
      await tx.stockReservation.updateMany({ where: { orderId, status: 'RESERVED' }, data: { status: 'CONSUMED' } });
      return d;
    });
    emitEvent('dispatch.created', { id: dispatch.id, orderId, orderNumber: order.orderNumber, driver: dispatch.driver.name, auto: true });
    await onOrderStatusChanged(orderId, order.status);
    res.status(201).json({ success: true, data: dispatch });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Driver workflow
// ---------------------------------------------------------------------------

async function ownDriver(req: Request) {
  return prisma.driver.findUnique({ where: { userId: Number(req.user!.userId) } });
}

/** The signed-in driver's open and recent deliveries. */
router.get('/my-deliveries', auth, authorizeRoles('DRIVER'), async (req, res, next) => {
  try {
    const driver = await ownDriver(req);
    if (!driver) return res.json({ success: true, data: { driver: null, open: [], done: [] } });
    const since = new Date(Date.now() - 3 * 86400000);
    const orders = await prisma.deliveryOrder.findMany({
      where: { driverId: driver.id, OR: [{ status: { in: [...OPEN] } }, { updatedAt: { gte: since } }] },
      orderBy: [{ timeSlotStart: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: { select: { itemId: true, itemName: true, quantity: true, unit: true, item: { select: { barcode: true, code: true, legacyBarcodes: true } as any } } as any },
        vehicle: { select: { plateNumber: true } },
        proofs: { select: { confirmationCode: true, recipientName: true, createdAt: true } },
        dispatches: { select: { id: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        payments: { where: { status: 'SUCCESSFUL' }, select: { amount: true } },
      },
    });
    const withDue = orders.map(({ payments, ...o }) => ({
      ...o,
      amountDue: Math.max(0, Math.round((Number(o.totalAmount) - payments.reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100),
    }));
    res.json({
      success: true,
      data: {
        driver: { id: driver.id, name: driver.name, status: driver.status },
        open: withDue.filter((o) => (OPEN as readonly string[]).includes(o.status)),
        done: withDue.filter((o) => !(OPEN as readonly string[]).includes(o.status)).slice(-20).reverse(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Driver starts a delivery (DISPATCHED → IN_TRANSIT). */
/** @openapi
 * /api/my-deliveries/{orderId}/start:
 *   post:
 *     summary: Start an assigned delivery (safe to retry after a lost response)
 *     tags: [Driver]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Delivery is in transit or was already started }
 *       404: { description: Delivery not assigned to this driver }
 */
router.post('/my-deliveries/:orderId/start', auth, authorizeRoles('DRIVER'), async (req, res, next) => {
  try {
    const driver = await ownDriver(req);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(req.params.orderId) } });
    if (!driver || !order || order.driverId !== driver.id) return bad(res, 'Delivery not found', 404);
    if (order.status === 'IN_TRANSIT') return res.json({ success: true, data: { alreadyStarted: true } });
    if (!['DISPATCHED', 'PENDING'].includes(order.status)) return bad(res, `This delivery is already ${order.status.replace('_', ' ').toLowerCase()}`);
    await prisma.$transaction([
      prisma.deliveryOrder.update({ where: { id: order.id }, data: { status: 'IN_TRANSIT' } }),
      prisma.dispatch.updateMany({ where: { orderId: order.id, status: { in: ['PENDING', 'DISPATCHED'] } }, data: { status: 'IN_TRANSIT', dispatchedAt: new Date() } }),
    ]);
    await onOrderStatusChanged(order.id, order.status);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** @openapi
 * /api/my-deliveries/{orderId}/complete:
 *   post:
 *     summary: Complete an assigned delivery with scanned quantities, GPS, proof, and cash collected
 *     tags: [Driver]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientName, signatureData, deliveredItems]
 *             properties:
 *               recipientName: { type: string }
 *               signatureData: { type: string, description: Signature data URL }
 *               photoData: { type: string, description: Optional delivery photo data URL }
 *               latitude: { type: number, minimum: -90, maximum: 90 }
 *               longitude: { type: number, minimum: -180, maximum: 180 }
 *               cashCollected: { type: number, minimum: 0 }
 *               notes: { type: string }
 *               deliveredItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [itemId, scannedQuantity, deliveredQuantity, verified]
 *                   properties:
 *                     itemId: { type: integer }
 *                     scannedQuantity: { type: integer, minimum: 0 }
 *                     deliveredQuantity: { type: integer, minimum: 0 }
 *                     scannedCode: { type: string }
 *                     verified: { type: boolean, enum: [true] }
 *     responses:
 *       200: { description: Delivery quantities, coordinates, proof, and collected cash recorded }
 *       400: { description: Invalid delivery proof or item quantities }
 *       404: { description: Delivery is not assigned to the signed-in driver }
 *       409: { description: Delivery changed while completion was being saved }
 */
router.post('/my-deliveries/:orderId/complete', auth, authorizeRoles('DRIVER'), async (req, res, next) => {
  try {
    const { recipientName, signatureData, photoData, notes, latitude, longitude, cashCollected, deliveredItems } = req.body || {};
    const cash = Math.round(Number(cashCollected || 0) * 100) / 100;
    if (!Number.isFinite(cash) || cash < 0) return bad(res, 'Cash collected must be a positive amount');
    if (!recipientName || !signatureData) return bad(res, 'Recipient name and signature are required');
    if (String(signatureData).length > 400_000 || (photoData && String(photoData).length > 2_000_000)) return bad(res, 'Signature or photo is too large');

    const driver = await ownDriver(req);
    const order: any = await prisma.deliveryOrder.findUnique({ where: { id: Number(req.params.orderId) }, include: { items: { select: { itemId: true, quantity: true, item: { select: { barcode: true, code: true, legacyBarcodes: true } as any } } as any }, dispatches: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!driver || !order || order.driverId !== driver.id) return bad(res, 'Delivery not found', 404);
    const dispatch = order.dispatches[0];
    if (!dispatch) return bad(res, 'No dispatch record for this order');
    if (order.status === 'DELIVERED') {
      const proof = await prisma.deliveryProof.findUnique({ where: { dispatchId: dispatch.id }, select: { confirmationCode: true } });
      if (proof) return res.json({ success: true, data: { confirmationCode: proof.confirmationCode, alreadyCompleted: true } });
      return bad(res, 'This delivery is already completed');
    }
    if (!Array.isArray(deliveredItems) || deliveredItems.length !== order.items.length) return bad(res, 'Scan and confirm every ordered product before completing delivery');
    const normalizedDeliveredItems = [];
    for (const line of order.items) {
      const scanned = deliveredItems.find((entry: any) => Number(entry.itemId) === line.itemId);
      const deliveredQuantity = Number(scanned?.deliveredQuantity);
      const scannedQuantity = Number(scanned?.scannedQuantity);
      if (!scanned || scanned.verified !== true || !Number.isInteger(deliveredQuantity) || deliveredQuantity < 0 || deliveredQuantity > line.quantity || !Number.isInteger(scannedQuantity) || scannedQuantity < 0 || scannedQuantity > line.quantity) {
        return bad(res, `Confirm a valid delivered quantity for each product (maximum ${line.quantity})`);
      }
      if (deliveredQuantity > scannedQuantity) return bad(res, 'Delivered quantity cannot exceed the number of products scanned');
      const scannedCode = String(scanned.scannedCode || '');
      if (scannedQuantity && ![line.item.barcode, line.item.code, ...line.item.legacyBarcodes].some((code) => code?.toLowerCase() === scannedCode.toLowerCase())) return bad(res, 'A scanned product barcode does not match the order');
      normalizedDeliveredItems.push({ itemId: line.itemId, scannedQuantity, deliveredQuantity, orderedQuantity: line.quantity, scannedCode: (scannedCode || line.item.barcode || line.item.code).slice(0, 128) });
    }

    const now = new Date();
    const confirmationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const completion = await prisma.$transaction(async (tx) => {
      // Claim the transition before creating proof or cash records. If two retries
      // arrive together, only one may create the payment.
      const claimed = await tx.deliveryOrder.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: 'DELIVERED', deliveredAt: now, deliveryAttempts: { increment: 1 } },
      });
      if (!claimed.count) {
        const existing = await tx.deliveryProof.findUnique({ where: { dispatchId: dispatch.id }, select: { confirmationCode: true } });
        return existing ? { confirmationCode: existing.confirmationCode, alreadyCompleted: true } : null;
      }
      await tx.deliveryProof.upsert({
        where: { dispatchId: dispatch.id },
        update: { recipientName, signatureData, photoUrl: photoData || null, notes, latitude, longitude, confirmationCode },
        create: { dispatchId: dispatch.id, orderId: order.id, recipientName, signatureData, photoUrl: photoData || null, notes, latitude, longitude, confirmationCode },
      });
      await tx.$executeRaw`UPDATE delivery_proofs SET delivered_items = ${JSON.stringify(normalizedDeliveredItems)}::jsonb WHERE dispatch_id = ${dispatch.id}`;
      await tx.dispatch.update({ where: { id: dispatch.id }, data: { status: 'DELIVERED', actualDelivery: now } });
      // Cash on delivery: the driver holds it until they hand it in (Cash page)
      if (cash > 0) {
        await tx.deliveryOrder.update({ where: { id: order.id }, data: { cashCollected: cash } });
        await tx.payment.create({
          data: {
            orderId: order.id, provider: 'CASH', amount: cash, status: 'SUCCESSFUL', completedAt: now,
            accountId: order.accountId, collectedByDriverId: driver.id, message: `Collected by ${driver.name} on delivery`,
          },
        });
      }
      return { confirmationCode, alreadyCompleted: false };
    });
    if (!completion) return bad(res, 'Delivery changed while this update was being saved. Refresh and review it.', 409);
    if (completion.alreadyCompleted) return res.json({ success: true, data: { confirmationCode: completion.confirmationCode, alreadyCompleted: true } });
    if (cash > 0) await refreshOrderPayment(order.id);
    await onOrderStatusChanged(order.id, order.status);
    res.json({ success: true, data: { confirmationCode: completion.confirmationCode } });
  } catch (error) {
    next(error);
  }
});

/** Driver can't deliver: record the reason; a failed-delivery return is opened for rescheduling. */
/** @openapi
 * /api/orders/{orderId}/fail:
 *   post:
 *     summary: Record a delivery exception with reason, notes, and optional photo
 *     tags: [Orders, Driver]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: Customer unavailable }
 *               notes: { type: string }
 *               photoData: { type: string, description: Optional image data URL, max 2 MB }
 *     responses:
 *       200: { description: Exception recorded or replayed }
 *       400: { description: Invalid reason or order state }
 *       404: { description: Order not found }
 */
router.post('/orders/:orderId/fail', auth, async (req, res, next) => {
  try {
    const { reason, notes, photoData } = req.body || {};
    if (!reason) return bad(res, 'A reason is required');
    if (photoData && String(photoData).length > 2_000_000) return bad(res, 'Exception photo is too large');
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(req.params.orderId) } });
    if (!order) return bad(res, 'Order not found', 404);
    if (req.user!.role === 'DRIVER') {
      const driver = await ownDriver(req);
      if (!driver || order.driverId !== driver.id) return bad(res, 'Delivery not found', 404);
    } else if (!(ROLES.orderManagers as string[]).includes(req.user!.role)) {
      return bad(res, 'Not allowed', 403);
    }
    if (order.status === 'FAILED') {
      const existing = await prisma.returnRequest.findFirst({ where: { orderId: order.id, type: 'FAILED_DELIVERY' }, orderBy: { createdAt: 'desc' } });
      if (existing) return res.json({ success: true, data: existing, alreadyRecorded: true });
    }
    if (!(OPEN as readonly string[]).includes(order.status)) return bad(res, 'Only open orders can be marked as failed');

    const ret = await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({ where: { id: order.id }, data: { status: 'FAILED', failureReason: String(reason).slice(0, 200), deliveryAttempts: { increment: 1 } } });
      await tx.dispatch.updateMany({ where: { orderId: order.id, status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] } }, data: { status: 'CANCELLED', notes: `Failed: ${reason}` } });
      const count = await tx.returnRequest.count();
      return tx.returnRequest.create({
        data: { returnNumber: `RET-${String(count + 1).padStart(6, '0')}`, orderId: order.id, type: 'FAILED_DELIVERY', reason: String(reason).slice(0, 200), notes: notes ? String(notes).slice(0, 2000) : null, photoUrl: photoData || null, createdBy: Number(req.user!.userId) },
      });
    });
    await onOrderStatusChanged(order.id, order.status);
    emitEvent('return.created', { id: ret.id, returnNumber: ret.returnNumber, orderNumber: order.orderNumber, type: ret.type });
    res.json({ success: true, data: ret });
  } catch (error) {
    next(error);
  }
});

/** REST fallback for drivers sharing their position (the app also uses Socket.IO). */
router.post('/drivers/me/location', auth, authorizeRoles('DRIVER'), async (req, res, next) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return bad(res, 'Valid lat and lng are required');
    const driver = await ownDriver(req);
    if (!driver) return bad(res, 'No driver profile linked to this account', 404);
    await prisma.driver.update({ where: { id: driver.id }, data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() } });
    emitToRoles(['ADMIN', 'DISPATCH_OFFICER'], 'driver:location', { driverId: driver.id, name: driver.name, lat, lng, at: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Calendar data
// ---------------------------------------------------------------------------

/** Deliveries and vehicle maintenance between two dates, for the calendar. */
router.get('/calendar', ...fleet, async (req, res, next) => {
  try {
    const from = new Date(String(req.query.from || new Date(Date.now() - 7 * 86400000).toISOString()));
    const to = new Date(String(req.query.to || new Date(Date.now() + 35 * 86400000).toISOString()));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to.getTime() - from.getTime() > 120 * 86400000) return bad(res, 'Choose a valid range (up to 120 days)');
    const [orders, maintenance] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: { OR: [{ timeSlotStart: { gte: from, lte: to } }, { timeSlotStart: null, scheduledDate: { gte: from, lte: to } }], status: { not: 'CANCELLED' } },
        select: { id: true, orderNumber: true, customerName: true, status: true, priority: true, timeSlotStart: true, timeSlotEnd: true, scheduledDate: true, driver: { select: { name: true } } },
        take: 1000,
      }),
      prisma.maintenanceRecord.findMany({
        where: { scheduledDate: { gte: from, lte: to } },
        select: { id: true, type: true, description: true, scheduledDate: true, completedDate: true, cost: true, vehicle: { select: { id: true, plateNumber: true } } },
        take: 500,
      }),
    ]);
    res.json({ success: true, data: { orders, maintenance } });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Live map data
// ---------------------------------------------------------------------------

router.get('/live-map', ...orderStaff, async (_req, res, next) => {
  try {
    const [drivers, orders, warehouses] = await Promise.all([
      prisma.driver.findMany({
        where: { currentLat: { not: null } },
        select: { id: true, name: true, phone: true, status: true, currentLat: true, currentLng: true, lastLocationAt: true, currentVehicle: { select: { plateNumber: true } } },
      }),
      prisma.deliveryOrder.findMany({
        where: { status: { in: [...OPEN] }, latitude: { not: null } },
        select: { id: true, orderNumber: true, customerName: true, deliveryAddress: true, status: true, priority: true, latitude: true, longitude: true, driverId: true, slaDeadline: true, timeSlotStart: true },
      }),
      prisma.warehouse.findMany({ where: { active: true, latitude: { not: null } }, select: { id: true, name: true, code: true, latitude: true, longitude: true } }),
    ]);
    res.json({
      success: true,
      data: {
        drivers: drivers.map((d) => ({ ...d, lat: Number(d.currentLat), lng: Number(d.currentLng), plate: d.currentVehicle?.plateNumber || null })),
        orders: orders.map((o) => ({ ...o, lat: Number(o.latitude), lng: Number(o.longitude) })),
        warehouses: warehouses.map((w) => ({ ...w, lat: Number(w.latitude), lng: Number(w.longitude) })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'RESCHEDULED', 'RECEIVED', 'REFUNDED', 'REJECTED'];

router.get('/returns', ...orderStaff, async (_req, res, next) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { order: { select: { id: true, orderNumber: true, customerName: true, totalAmount: true, contactNumber: true, deliveryAddress: true, status: true } } },
    });
    res.json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
});

router.post('/returns', ...orderStaff, async (req, res, next) => {
  try {
    const { orderId, reason, notes, refundAmount } = req.body || {};
    if (!orderId || !reason) return bad(res, 'orderId and reason are required');
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(orderId) } });
    if (!order) return bad(res, 'Order not found', 404);
    const count = await prisma.returnRequest.count();
    const ret = await prisma.returnRequest.create({
      data: {
        returnNumber: `RET-${String(count + 1).padStart(6, '0')}`, orderId: order.id, type: 'RETURN', reason, notes,
        refundAmount: refundAmount !== undefined ? Number(refundAmount) : Number(order.totalAmount), createdBy: Number(req.user!.userId),
      },
    });
    emitEvent('return.created', { id: ret.id, returnNumber: ret.returnNumber, orderNumber: order.orderNumber, type: ret.type });
    res.status(201).json({ success: true, data: ret });
  } catch (error) {
    next(error);
  }
});

/**
 * Move a return through its workflow. Rescheduling a failed delivery puts the
 * order back to PENDING with the new date; receiving a return restocks items;
 * refunding marks the order payment as refunded.
 */
router.post('/returns/:id/status', ...orderStaff, async (req, res, next) => {
  try {
    const { status, rescheduledDate, notes } = req.body || {};
    if (!RETURN_STATUSES.includes(status)) return bad(res, `Status must be one of: ${RETURN_STATUSES.join(', ')}`);
    const ret = await prisma.returnRequest.findUnique({ where: { id: Number(req.params.id) }, include: { order: { include: { items: true } } } });
    if (!ret) return bad(res, 'Return not found', 404);
    if (status === 'RESCHEDULED' && !rescheduledDate) return bad(res, 'Pick the new delivery date');
    const userId = Number(req.user!.userId);
    const previousOrderStatus = ret.order.status;

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'RESCHEDULED') {
        const when = new Date(rescheduledDate);
        await tx.deliveryOrder.update({
          where: { id: ret.orderId },
          data: { status: 'PENDING', scheduledDate: when, timeSlotStart: when, timeSlotEnd: new Date(when.getTime() + 2 * 3600000), failureReason: null, driverId: null, vehicleId: null },
        });
      }
      if (status === 'RECEIVED' && ret.type === 'RETURN') {
        const warehouse = await tx.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' }, select: { id: true } });
        for (const line of ret.order.items) {
          const item = await tx.inventoryItem.update({ where: { id: line.itemId }, data: { quantity: { increment: line.quantity } } });
          if (warehouse) await tx.warehouseStock.upsert({
            where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: line.itemId } },
            create: { warehouseId: warehouse.id, itemId: line.itemId, quantity: line.quantity },
            update: { quantity: { increment: line.quantity } },
          });
          await tx.inventoryHistory.create({
            data: { itemId: line.itemId, orderId: ret.orderId, action: 'stock_in', quantity: line.quantity, previousQuantity: item.quantity - line.quantity, newQuantity: item.quantity, notes: `Returned via ${ret.returnNumber}`, performedBy: userId },
          });
        }
        await tx.deliveryOrder.update({ where: { id: ret.orderId }, data: { status: 'RETURNED' } });
      }
      if (status === 'REFUNDED') {
        await tx.deliveryOrder.update({ where: { id: ret.orderId }, data: { paymentStatus: 'REFUNDED' } });
      }
      return tx.returnRequest.update({
        where: { id: ret.id },
        data: {
          status,
          notes: notes ?? undefined,
          rescheduledDate: status === 'RESCHEDULED' ? new Date(rescheduledDate) : undefined,
          resolvedAt: ['RECEIVED', 'REFUNDED', 'REJECTED', 'RESCHEDULED'].includes(status) ? new Date() : null,
        },
      });
    });
    await onOrderStatusChanged(ret.orderId, previousOrderStatus);
    emitEvent('return.updated', { id: updated.id, returnNumber: updated.returnNumber, status: updated.status });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Public order tracking (no login)
// ---------------------------------------------------------------------------

router.get('/public/track/:orderNumber', publicTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { orderNumber: String(req.params.orderNumber).toUpperCase() },
      select: {
        orderNumber: true, status: true, priority: true, createdAt: true, scheduledDate: true, timeSlotStart: true, timeSlotEnd: true,
        deliveredAt: true, updatedAt: true, failureReason: true, deliveryAddress: true, latitude: true, longitude: true,
        driver: { select: { name: true, currentLat: true, currentLng: true, lastLocationAt: true, rating: true } },
        vehicle: { select: { plateNumber: true, type: true } },
        items: { select: { itemName: true, quantity: true, unit: true } },
      },
    });
    if (!order) return bad(res, 'We could not find an order with that number', 404);
    const live = order.status === 'IN_TRANSIT' && order.driver?.currentLat;
    const area = order.deliveryAddress.split(',').slice(-2).join(',').trim();
    const destination = order.latitude ? { lat: Number(order.latitude), lng: Number(order.longitude) } : null;
    const driverPos = live ? { lat: Number(order.driver!.currentLat), lng: Number(order.driver!.currentLng) } : null;
    const etaMinutes = driverPos && destination ? Math.round((haversineKm(driverPos, destination) * 1.35 / 22) * 60) + 3 : null;
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber, status: order.status, priority: order.priority, createdAt: order.createdAt,
        scheduledDate: order.scheduledDate, timeSlotStart: order.timeSlotStart, timeSlotEnd: order.timeSlotEnd,
        deliveredAt: order.deliveredAt, updatedAt: order.updatedAt, failureReason: order.failureReason,
        // Only the area, not the full street address
        area,
        destination: destination ? { lat: Math.round(destination.lat * 1000) / 1000, lng: Math.round(destination.lng * 1000) / 1000 } : null,
        driver: order.driver ? { firstName: order.driver.name.split(' ')[0], rating: order.driver.rating ? Number(order.driver.rating) : null, location: driverPos, lastSeen: order.driver.lastLocationAt } : null,
        vehicle: order.vehicle,
        etaMinutes,
        itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
