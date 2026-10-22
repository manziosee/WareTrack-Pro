import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { tenantFields } from '../lib/tenantContext';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { nextDocumentNumber } from '../lib/documentNumbers';
import { onOrderStatusChanged } from '../services/orderLifecycle';
import { NotificationService } from '../services/notificationService';

/**
 * Trip planner: put several orders on one vehicle, check the load fits, then
 * send the whole trip at once. Mounted at /api.
 */
const router = Router();
const fleet = [auth, authorizeRoles(...ROLES.fleetManagers)];

const bad = (res: Response, message: string, status = 400, details?: unknown) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR', message, details } });
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** Total weight and volume of orders (items without a weight are counted separately). */
export async function loadOf(orderIds: number[]) {
  if (!orderIds.length) return { weightKg: 0, volumeL: 0, units: 0, missingWeight: 0, byOrder: new Map<number, { weightKg: number; volumeL: number; units: number; missingWeight: number }>() };
  const lines = await prisma.orderItem.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, quantity: true, item: { select: { weightKg: true, volumeL: true } } } });
  const byOrder = new Map<number, { weightKg: number; volumeL: number; units: number; missingWeight: number }>();
  for (const l of lines) {
    const o = byOrder.get(l.orderId) || { weightKg: 0, volumeL: 0, units: 0, missingWeight: 0 };
    o.units += l.quantity;
    if (l.item.weightKg === null) o.missingWeight += l.quantity;
    else o.weightKg += l.quantity * Number(l.item.weightKg);
    if (l.item.volumeL !== null) o.volumeL += l.quantity * Number(l.item.volumeL);
    byOrder.set(l.orderId, o);
  }
  const all = [...byOrder.values()];
  return {
    weightKg: round(all.reduce((s, o) => s + o.weightKg, 0)),
    volumeL: round(all.reduce((s, o) => s + o.volumeL, 0)),
    units: all.reduce((s, o) => s + o.units, 0),
    missingWeight: all.reduce((s, o) => s + o.missingWeight, 0),
    byOrder,
  };
}

/** Does this load fit the vehicle? */
function fits(load: { weightKg: number; volumeL: number }, vehicle: { capacity: number; volumeL: unknown }) {
  const problems: string[] = [];
  if (vehicle.capacity && load.weightKg > vehicle.capacity) problems.push(`${round(load.weightKg)} kg is more than the ${vehicle.capacity} kg the vehicle carries`);
  if (vehicle.volumeL !== null && Number(vehicle.volumeL) > 0 && load.volumeL > Number(vehicle.volumeL)) problems.push(`${round(load.volumeL)} L is more than the ${Number(vehicle.volumeL)} L of space`);
  return problems;
}

const PLANNABLE = { status: 'PENDING' as const, driverId: null, tripId: null };

/**
 * @swagger
 * /api/trips/planner:
 *   get:
 *     tags: [Trips]
 *     summary: Everything to plan trips - orders waiting for a vehicle (with their load), free vehicles and drivers, and planned trips
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Planner board } }
 */
router.get('/trips/planner', ...fleet, async (_req, res, next) => {
  try {
    const [orders, vehicles, drivers, trips] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: PLANNABLE,
        orderBy: [{ priority: 'asc' }, { timeSlotStart: 'asc' }, { createdAt: 'asc' }],
        take: 300,
        select: { id: true, orderNumber: true, customerName: true, deliveryAddress: true, priority: true, totalAmount: true, timeSlotStart: true, scheduledDate: true, packingStatus: true },
      }),
      prisma.vehicle.findMany({ where: { status: 'AVAILABLE' }, orderBy: { capacity: 'desc' }, select: { id: true, plateNumber: true, type: true, capacity: true, volumeL: true, vehicleModel: true } }),
      prisma.driver.findMany({ where: { status: 'AVAILABLE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true, currentVehicleId: true } }),
      prisma.trip.findMany({
        where: { status: { in: ['PLANNED', 'DISPATCHED'] } },
        orderBy: { plannedDate: 'asc' },
        include: { vehicle: { select: { id: true, plateNumber: true, capacity: true, volumeL: true } }, driver: { select: { id: true, name: true } }, orders: { select: { id: true, orderNumber: true, customerName: true, status: true } } },
      }),
    ]);
    const load = await loadOf([...orders.map((o) => o.id), ...trips.flatMap((t) => t.orders.map((o) => o.id))]);
    const orderLoad = (id: number) => load.byOrder.get(id) || { weightKg: 0, volumeL: 0, units: 0, missingWeight: 0 };
    res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({ ...o, load: orderLoad(o.id) })),
        vehicles,
        drivers,
        trips: trips.map((t) => {
          const total = t.orders.reduce((acc, o) => {
            const l = orderLoad(o.id);
            return { weightKg: acc.weightKg + l.weightKg, volumeL: acc.volumeL + l.volumeL, missingWeight: acc.missingWeight + l.missingWeight };
          }, { weightKg: 0, volumeL: 0, missingWeight: 0 });
          return { ...t, load: { weightKg: round(total.weightKg), volumeL: round(total.volumeL), missingWeight: total.missingWeight } };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/trips/load-check:
 *   post:
 *     tags: [Trips]
 *     summary: Would these orders fit this vehicle?
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { vehicleId: { type: integer }, orderIds: { type: array, items: { type: integer } } } }
 *     responses: { 200: { description: Load, capacity and any problems } }
 */
router.post('/trips/load-check', ...fleet, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(req.body?.vehicleId) } });
    if (!vehicle) return bad(res, 'Vehicle not found', 404);
    const orderIds = (Array.isArray(req.body?.orderIds) ? req.body.orderIds : []).map(Number);
    const load = await loadOf(orderIds);
    const problems = fits(load, vehicle);
    res.json({ success: true, data: { weightKg: load.weightKg, volumeL: load.volumeL, units: load.units, missingWeight: load.missingWeight, capacityKg: vehicle.capacity, volumeCapacityL: vehicle.volumeL === null ? null : Number(vehicle.volumeL), fits: !problems.length, problems } });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/trips:
 *   get:
 *     tags: [Trips]
 *     summary: Trips, newest first
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Trips } }
 *   post:
 *     tags: [Trips]
 *     summary: Plan a trip - orders on one vehicle with one driver. Refused if the load doesn't fit (admins may force).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, driverId, orderIds]
 *             properties:
 *               vehicleId: { type: integer }
 *               driverId: { type: integer }
 *               orderIds: { type: array, items: { type: integer } }
 *               plannedDate: { type: string, format: date-time }
 *               notes: { type: string }
 *               force: { type: boolean }
 *     responses: { 201: { description: Planned }, 409: { description: Over capacity or orders not available } }
 */
router.get('/trips', ...fleet, async (_req, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { plannedDate: 'desc' },
      take: 200,
      include: { vehicle: { select: { id: true, plateNumber: true } }, driver: { select: { id: true, name: true } }, _count: { select: { orders: true } } },
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    next(error);
  }
});

router.post('/trips', ...fleet, async (req, res, next) => {
  try {
    const vehicleId = Number(req.body?.vehicleId);
    const driverId = Number(req.body?.driverId);
    const orderIds: number[] = [...new Set<number>((Array.isArray(req.body?.orderIds) ? req.body.orderIds : []).map(Number))];
    if (!vehicleId || !driverId || !orderIds.length) return bad(res, 'Choose a vehicle, a driver and at least one order');
    const [vehicle, driver] = await Promise.all([prisma.vehicle.findUnique({ where: { id: vehicleId } }), prisma.driver.findUnique({ where: { id: driverId } })]);
    if (!vehicle) return bad(res, 'Vehicle not found', 404);
    if (!driver) return bad(res, 'Driver not found', 404);
    if (vehicle.status !== 'AVAILABLE' && vehicle.status !== 'IN_USE') return bad(res, `${vehicle.plateNumber} is ${vehicle.status.toLowerCase()}`, 409);
    const orders = await prisma.deliveryOrder.findMany({ where: { id: { in: orderIds }, ...PLANNABLE }, select: { id: true } });
    if (orders.length !== orderIds.length) return bad(res, 'Some orders are no longer waiting for a vehicle. Refresh and try again.', 409);
    const load = await loadOf(orderIds);
    const problems = fits(load, vehicle);
    if (problems.length && !(req.body?.force && req.user!.role === 'ADMIN')) return bad(res, `Too much for ${vehicle.plateNumber}: ${problems.join('; ')}`, 409, { problems });
    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          ...tenantFields(), tripNumber: await nextDocumentNumber('trip', 'TRIP', 5), vehicleId, driverId,
          plannedDate: req.body?.plannedDate ? new Date(req.body.plannedDate) : new Date(), notes: req.body?.notes ? String(req.body.notes).slice(0, 500) : null,
          createdById: Number(req.user!.userId),
        },
      });
      const linked = await tx.deliveryOrder.updateMany({ where: { id: { in: orderIds }, ...PLANNABLE }, data: { tripId: created.id } });
      if (linked.count !== orderIds.length) throw Object.assign(new Error('Some orders were taken by another trip. Refresh and try again.'), { status: 409 });
      return created;
    });
    res.status(201).json({ success: true, data: { ...trip, load: { weightKg: load.weightKg, volumeL: load.volumeL, missingWeight: load.missingWeight }, warnings: problems } });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Change a planned trip's orders, vehicle, driver or date. */
router.put('/trips/:id', ...fleet, async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: Number(req.params.id) }, include: { vehicle: true, orders: { select: { id: true } } } });
    if (!trip) return bad(res, 'Trip not found', 404);
    if (trip.status !== 'PLANNED') return bad(res, 'Only planned trips can be changed', 409);
    const vehicle = req.body?.vehicleId ? await prisma.vehicle.findUnique({ where: { id: Number(req.body.vehicleId) } }) : trip.vehicle;
    if (!vehicle) return bad(res, 'Vehicle not found', 404);
    const orderIds: number[] = Array.isArray(req.body?.orderIds) ? [...new Set<number>(req.body.orderIds.map(Number))] : trip.orders.map((o) => o.id);
    const load = await loadOf(orderIds);
    const problems = fits(load, vehicle);
    if (problems.length && !(req.body?.force && req.user!.role === 'ADMIN')) return bad(res, `Too much for ${vehicle.plateNumber}: ${problems.join('; ')}`, 409, { problems });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.updateMany({ where: { tripId: trip.id, id: { notIn: orderIds } }, data: { tripId: null } });
      const added = orderIds.filter((id) => !trip.orders.some((o) => o.id === id));
      if (added.length) {
        const linked = await tx.deliveryOrder.updateMany({ where: { id: { in: added }, ...PLANNABLE }, data: { tripId: trip.id } });
        if (linked.count !== added.length) throw Object.assign(new Error('Some orders are no longer waiting for a vehicle'), { status: 409 });
      }
      return tx.trip.update({
        where: { id: trip.id },
        data: {
          vehicleId: vehicle.id,
          ...(req.body?.driverId && { driverId: Number(req.body.driverId) }),
          ...(req.body?.plannedDate && { plannedDate: new Date(req.body.plannedDate) }),
          ...(req.body?.notes !== undefined && { notes: req.body.notes ? String(req.body.notes).slice(0, 500) : null }),
        },
      });
    });
    res.json({ success: true, data: { ...updated, load: { weightKg: load.weightKg, volumeL: load.volumeL } } });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/**
 * @swagger
 * /api/trips/{id}/dispatch:
 *   post:
 *     tags: [Trips]
 *     summary: Send the trip - every order is dispatched to the trip's driver and vehicle at once
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dispatched } }
 */
router.post('/trips/:id/dispatch', ...fleet, async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: Number(req.params.id) }, include: { orders: { select: { id: true, orderNumber: true, customerName: true, status: true } }, driver: true, vehicle: true } });
    if (!trip) return bad(res, 'Trip not found', 404);
    if (trip.status !== 'PLANNED') return bad(res, `This trip is already ${trip.status.toLowerCase()}`, 409);
    if (!trip.orders.length) return bad(res, 'Add orders to the trip first');
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const order of trip.orders) {
        await tx.dispatch.create({
          data: {
            orderId: order.id, driverId: trip.driverId, vehicleId: trip.vehicleId, scheduledDate: trip.plannedDate, dispatchedAt: now,
            status: 'DISPATCHED', createdBy: Number(req.user!.userId), notes: `Trip ${trip.tripNumber}`,
          } as any,
        });
        await tx.deliveryOrder.update({ where: { id: order.id }, data: { status: 'DISPATCHED', driverId: trip.driverId, vehicleId: trip.vehicleId } });
      }
      await tx.trip.update({ where: { id: trip.id }, data: { status: 'DISPATCHED' } });
    });
    for (const order of trip.orders) await onOrderStatusChanged(order.id, order.status);
    if (trip.driver.userId) {
      NotificationService.createNotification({
        userId: trip.driver.userId, type: 'ORDER_UPDATE', severity: 'INFO', title: `Trip ${trip.tripNumber}: ${trip.orders.length} deliveries 🚛`,
        message: `${trip.vehicle.plateNumber}: ${trip.orders.map((o) => o.customerName).join(', ')}`,
      }).catch(() => undefined);
    }
    res.json({ success: true, data: { id: trip.id, tripNumber: trip.tripNumber, dispatched: trip.orders.length } });
  } catch (error) {
    next(error);
  }
});

router.post('/trips/:id/cancel', ...fleet, async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: Number(req.params.id) } });
    if (!trip) return bad(res, 'Trip not found', 404);
    if (trip.status !== 'PLANNED') return bad(res, 'Only planned trips can be cancelled; cancel the dispatches of a sent trip instead', 409);
    await prisma.$transaction([
      prisma.deliveryOrder.updateMany({ where: { tripId: trip.id }, data: { tripId: null } }),
      prisma.trip.update({ where: { id: trip.id }, data: { status: 'CANCELLED' } }),
    ]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
