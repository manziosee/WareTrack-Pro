import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

/** An order keeps its driver and vehicle busy while it is in one of these states. */
export const ACTIVE_ORDER_STATUSES = ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] as const;

const activeWhere = () => ({ status: { in: [...ACTIVE_ORDER_STATUSES] } });

/** Dispatch status that matches an order status (null = leave the dispatch alone). */
const DISPATCH_FOR_ORDER: Record<string, 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | null> = {
  PENDING: null,
  DISPATCHED: 'DISPATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED: 'CANCELLED',
  RETURNED: 'CANCELLED',
};

/** Open orders assigned to a driver, newest first. */
export function activeOrdersForDriver(driverId: number, db: Db = prisma) {
  return db.deliveryOrder.findMany({
    where: { driverId, ...activeWhere() },
    select: { id: true, orderNumber: true, status: true, vehicleId: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export function activeOrdersForVehicle(vehicleId: number, db: Db = prisma) {
  return db.deliveryOrder.findMany({
    where: { vehicleId, ...activeWhere() },
    select: { id: true, orderNumber: true, status: true, driverId: true },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * A driver is ON_DUTY while they have an open delivery and AVAILABLE once the
 * last one is finished. OFF_DUTY is a manual choice and is kept when idle.
 */
export async function syncDriverStatus(driverId: number | null | undefined, db: Db = prisma) {
  if (!driverId) return;
  const driver = await db.driver.findUnique({ where: { id: driverId }, select: { status: true, currentVehicleId: true } });
  if (!driver) return;
  const active = await activeOrdersForDriver(driverId, db);
  const data: { status?: 'ON_DUTY' | 'AVAILABLE'; currentVehicleId?: number } = {};
  if (active.length) {
    if (driver.status !== 'ON_DUTY') data.status = 'ON_DUTY';
    const vehicleId = active.find((o) => o.vehicleId)?.vehicleId;
    if (vehicleId && vehicleId !== driver.currentVehicleId) data.currentVehicleId = vehicleId;
  } else if (driver.status === 'ON_DUTY') {
    data.status = 'AVAILABLE';
  }
  if (Object.keys(data).length) await db.driver.update({ where: { id: driverId }, data });
}

/**
 * A vehicle is IN_USE while it carries an open delivery and AVAILABLE when idle.
 * MAINTENANCE and UNAVAILABLE are manual and are kept when idle.
 */
export async function syncVehicleStatus(vehicleId: number | null | undefined, db: Db = prisma) {
  if (!vehicleId) return;
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
  if (!vehicle) return;
  const busy = (await activeOrdersForVehicle(vehicleId, db)).length > 0;
  const next = busy ? 'IN_USE' : vehicle.status === 'IN_USE' ? 'AVAILABLE' : vehicle.status;
  if (next !== vehicle.status) await db.vehicle.update({ where: { id: vehicleId }, data: { status: next } });
}

/** Bring the order's dispatch, driver and vehicle in line with the order's status. */
export async function syncFleetForOrder(orderId: number, extra: { driverIds?: (number | null)[]; vehicleIds?: (number | null)[] } = {}) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { status: true, driverId: true, vehicleId: true } });
  if (!order) return;
  const dispatchStatus = DISPATCH_FOR_ORDER[order.status];
  if (dispatchStatus) {
    const now = new Date();
    await prisma.dispatch.updateMany({
      where: { orderId, status: { notIn: ['DELIVERED', 'CANCELLED', dispatchStatus] } },
      data: {
        status: dispatchStatus,
        ...(dispatchStatus === 'DELIVERED' && { actualDelivery: now }),
        ...(dispatchStatus === 'DISPATCHED' && { dispatchedAt: now }),
      },
    });
  }
  const driverIds = new Set([order.driverId, ...(extra.driverIds || [])].filter(Boolean) as number[]);
  const vehicleIds = new Set([order.vehicleId, ...(extra.vehicleIds || [])].filter(Boolean) as number[]);
  for (const id of driverIds) await syncDriverStatus(id);
  for (const id of vehicleIds) await syncVehicleStatus(id);
  await completeTripIfDone(orderId);
}

/** A sent trip is completed once none of its orders is still open. */
async function completeTripIfDone(orderId: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { tripId: true } });
  if (!order?.tripId) return;
  const open = await prisma.deliveryOrder.count({ where: { tripId: order.tripId, status: { in: [...ACTIVE_ORDER_STATUSES] } } });
  if (!open) await prisma.trip.updateMany({ where: { id: order.tripId, status: 'DISPATCHED' }, data: { status: 'COMPLETED' } });
}

/**
 * Repair everything at once: close dispatches whose order is finished, then
 * recompute every driver and vehicle. Run at startup and by the background jobs.
 */
export async function reconcileFleet() {
  const stale = await prisma.dispatch.findMany({
    where: { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] }, order: { status: { notIn: [...ACTIVE_ORDER_STATUSES] } } },
    select: { id: true, order: { select: { status: true, deliveredAt: true } } },
  });
  for (const d of stale) {
    const status = DISPATCH_FOR_ORDER[d.order.status] || 'CANCELLED';
    await prisma.dispatch.update({
      where: { id: d.id },
      data: { status, ...(status === 'DELIVERED' && { actualDelivery: d.order.deliveredAt || new Date() }) },
    });
  }
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({ select: { id: true } }),
    prisma.vehicle.findMany({ select: { id: true } }),
  ]);
  for (const d of drivers) await syncDriverStatus(d.id);
  for (const v of vehicles) await syncVehicleStatus(v.id);
  return { closedDispatches: stale.length };
}
