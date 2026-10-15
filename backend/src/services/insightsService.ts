import { prisma } from '../lib/prisma';

/**
 * Dashboard and report metrics. Everything is computed from one pass over recent
 * orders so each dashboard needs a single request.
 */

const DAY = 24 * 60 * 60 * 1000;

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dayKey = (d: Date) => startOfDay(d).toISOString().slice(0, 10);
const shortDay = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const change = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : current > 0 ? 100 : 0;
const num = (v: unknown) => Number(v) || 0;

type OrderRow = Awaited<ReturnType<typeof loadOrders>>[number];

async function loadOrders(since: Date, where: Record<string, unknown> = {}) {
  return prisma.deliveryOrder.findMany({
    where: { createdAt: { gte: since }, ...where },
    select: {
      id: true, orderNumber: true, customerName: true, status: true, priority: true, totalAmount: true,
      createdAt: true, deliveredAt: true, scheduledDate: true, slaDeadline: true, timeSlotStart: true,
      timeSlotEnd: true, driverId: true, vehicleId: true, paymentMethod: true, paymentStatus: true,
      deliveryAddress: true, latitude: true, longitude: true, warehouseId: true, failureReason: true,
      items: { select: { itemId: true, itemName: true, quantity: true, totalPrice: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** Daily series for the last `days` days (oldest first), filled with zeros. */
function dailySeries<T>(days: number, rows: T[], dateOf: (r: T) => Date | null, valueOf: (r: T) => number = () => 1) {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) map.set(dayKey(new Date(Date.now() - i * DAY)), 0);
  for (const r of rows) {
    const d = dateOf(r);
    if (!d) continue;
    const key = dayKey(d);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + valueOf(r));
  }
  return Array.from(map.entries()).map(([date, value]) => ({ date, label: shortDay(date), value: Math.round(value) }));
}

const isOnTime = (o: OrderRow) => o.deliveredAt && (!o.slaDeadline || o.deliveredAt <= o.slaDeadline);

function countBy<T>(rows: T[], keyOf: (r: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function areaOf(address: string) {
  const parts = address.split(',').map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

/** Shared order metrics for a set of orders. */
function orderMetrics(orders: OrderRow[]) {
  const now = Date.now();
  const d7 = now - 7 * DAY;
  const d14 = now - 14 * DAY;
  const d30 = now - 30 * DAY;
  const d60 = now - 60 * DAY;
  const last7 = orders.filter((o) => o.createdAt.getTime() >= d7);
  const prev7 = orders.filter((o) => o.createdAt.getTime() >= d14 && o.createdAt.getTime() < d7);
  const last30 = orders.filter((o) => o.createdAt.getTime() >= d30);
  const prev30 = orders.filter((o) => o.createdAt.getTime() >= d60 && o.createdAt.getTime() < d30);
  const revenue = (rows: OrderRow[]) => rows.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + num(o.totalAmount), 0);

  const delivered30 = last30.filter((o) => o.status === 'DELIVERED');
  const deliveredPrev30 = prev30.filter((o) => o.status === 'DELIVERED');
  const onTime30 = pct(delivered30.filter(isOnTime).length, delivered30.length);
  const onTimePrev30 = pct(deliveredPrev30.filter(isOnTime).length, deliveredPrev30.length);

  const today = startOfDay().getTime();
  const tomorrow = today + DAY;
  const scheduledToday = orders.filter((o) => {
    const t = (o.timeSlotStart || o.scheduledDate)?.getTime();
    return t !== undefined && t >= today && t < tomorrow;
  });

  // Weekly on-time rate for the last 8 weeks
  const onTimeTrend = Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const week = orders.filter((o) => o.status === 'DELIVERED' && o.deliveredAt && o.deliveredAt.getTime() >= start && o.deliveredAt.getTime() < end);
    return {
      label: new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      onTime: pct(week.filter(isOnTime).length, week.length),
      deliveries: week.length,
    };
  });

  const byHour = Array.from({ length: 14 }, (_, i) => ({ hour: `${String(i + 7).padStart(2, '0')}:00`, value: 0 }));
  for (const o of orders) {
    if (o.status !== 'DELIVERED' || !o.deliveredAt) continue;
    const h = o.deliveredAt.getHours();
    if (h >= 7 && h <= 20) byHour[h - 7].value++;
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byWeekday = weekdays.map((name) => ({ name, value: 0 }));
  for (const o of last30) byWeekday[o.createdAt.getDay()].value++;
  const weekdayOrdered = [...byWeekday.slice(1), byWeekday[0]];

  const atRisk = orders
    .filter((o) => ['PENDING', 'DISPATCHED', 'IN_TRANSIT'].includes(o.status) && o.slaDeadline)
    .map((o) => ({ ...o, hoursLeft: Math.round(((o.slaDeadline!.getTime() - now) / (60 * 60 * 1000)) * 10) / 10 }))
    .filter((o) => o.hoursLeft < 12)
    .sort((a, b) => a.hoursLeft - b.hoursLeft)
    .slice(0, 8)
    .map((o) => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, status: o.status, priority: o.priority, hoursLeft: o.hoursLeft }));

  return {
    last7, prev7, last30, prev30, revenue, onTime30, onTimePrev30, scheduledToday, onTimeTrend,
    byHour, byWeekday: weekdayOrdered, atRisk,
    statusMix: countBy(last30, (o) => o.status),
    priorityMix: countBy(last30, (o) => o.priority),
    areaMix: countBy(last30, (o) => areaOf(o.deliveryAddress)).slice(0, 8),
    paymentMix: countBy(last30.filter((o) => o.paymentStatus === 'PAID'), (o) => o.paymentMethod),
    failureReasons: countBy(orders.filter((o) => o.failureReason), (o) => o.failureReason),
  };
}

async function inventoryMetrics() {
  const now = Date.now();
  const [items, warehouses, batches, purchaseOrders, history] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true, category: true, quantity: true, minQuantity: true, unitPrice: true, unit: true },
    }),
    prisma.warehouse.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true, city: true, capacity: true, stock: { select: { quantity: true, item: { select: { unitPrice: true } } } } },
    }),
    prisma.inventoryBatch.findMany({
      where: { expiryDate: { not: null, lte: new Date(now + 60 * DAY) }, quantity: { gt: 0 } },
      select: { id: true, batchNumber: true, quantity: true, expiryDate: true, item: { select: { name: true, unit: true } } },
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.purchaseOrder.findMany({ select: { status: true, totalAmount: true, createdAt: true } }),
    prisma.inventoryHistory.findMany({
      where: { performedAt: { gte: new Date(now - 30 * DAY) } },
      select: { action: true, quantity: true, performedAt: true },
    }),
  ]);

  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.minQuantity);
  const outOfStock = items.filter((i) => i.quantity === 0);
  const stockValue = items.reduce((s, i) => s + i.quantity * num(i.unitPrice), 0);

  const categoryMap = new Map<string, { name: string; items: number; units: number; value: number }>();
  for (const i of items) {
    const c = categoryMap.get(i.category) || { name: i.category, items: 0, units: 0, value: 0 };
    c.items++;
    c.units += i.quantity;
    c.value += i.quantity * num(i.unitPrice);
    categoryMap.set(i.category, c);
  }

  const stockIn = dailySeries(30, history.filter((h) => h.action === 'stock_in'), (h) => h.performedAt, (h) => h.quantity);
  const stockOut = dailySeries(30, history.filter((h) => h.action === 'stock_out'), (h) => h.performedAt, (h) => h.quantity);

  // Expiring batches grouped by week
  const expiryWeeks = Array.from({ length: 8 }, (_, i) => ({ label: i === 0 ? 'This week' : `+${i}w`, value: 0 }));
  for (const b of batches) {
    const weeks = Math.floor((b.expiryDate!.getTime() - now) / (7 * DAY));
    if (weeks >= 0 && weeks < 8) expiryWeeks[weeks].value += b.quantity;
  }

  return {
    totalSkus: items.length,
    stockValue: Math.round(stockValue),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    restockList: [...outOfStock, ...lowStock]
      .sort((a, b) => a.quantity / Math.max(a.minQuantity, 1) - b.quantity / Math.max(b.minQuantity, 1))
      .slice(0, 8)
      .map((i) => ({ id: i.id, name: i.name, code: i.code, quantity: i.quantity, minQuantity: i.minQuantity, unit: i.unit })),
    byCategory: Array.from(categoryMap.values()).map((c) => ({ ...c, value: Math.round(c.value) })).sort((a, b) => b.value - a.value),
    byWarehouse: warehouses.map((w) => {
      const units = w.stock.reduce((s, x) => s + x.quantity, 0);
      return {
        name: w.name.replace(/ (Warehouse|Distribution Hub|Depot)$/, ''), code: w.code, city: w.city, units,
        value: Math.round(w.stock.reduce((s, x) => s + x.quantity * num(x.item.unitPrice), 0)),
        utilization: w.capacity ? Math.min(100, pct(units, w.capacity)) : null,
      };
    }),
    stockFlow: stockIn.map((d, i) => ({ label: d.label, stockIn: d.value, stockOut: stockOut[i].value })),
    expiringSoon: batches.filter((b) => b.expiryDate!.getTime() <= now + 30 * DAY).length,
    expiryWeeks,
    expiringBatches: batches.slice(0, 6).map((b) => ({
      id: b.id, batchNumber: b.batchNumber, item: b.item.name, quantity: b.quantity, unit: b.item.unit,
      daysLeft: Math.ceil((b.expiryDate!.getTime() - now) / DAY),
    })),
    purchaseOrderMix: countBy(purchaseOrders, (p) => p.status),
    openPurchaseOrders: purchaseOrders.filter((p) => ['DRAFT', 'SENT'].includes(p.status)).length,
  };
}

async function fleetMetrics() {
  const [drivers, vehicles, maintenance] = await Promise.all([
    prisma.driver.findMany({ select: { id: true, name: true, status: true, rating: true, currentVehicleId: true } }),
    prisma.vehicle.findMany({ select: { id: true, plateNumber: true, type: true, status: true } }),
    prisma.maintenanceRecord.findMany({
      where: { completedDate: null, scheduledDate: { gte: startOfDay(), lte: new Date(Date.now() + 30 * DAY) } },
      select: { id: true, type: true, description: true, scheduledDate: true, vehicle: { select: { plateNumber: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 6,
    }),
  ]);
  return {
    drivers,
    driverStatus: countBy(drivers, (d) => d.status),
    vehicleStatus: countBy(vehicles, (v) => v.status),
    vehicleTypes: countBy(vehicles, (v) => v.type),
    availableDrivers: drivers.filter((d) => d.status === 'AVAILABLE').length,
    availableVehicles: vehicles.filter((v) => v.status === 'AVAILABLE').length,
    vehicleCount: vehicles.length,
    upcomingMaintenance: maintenance.map((m) => ({
      id: m.id, plateNumber: m.vehicle.plateNumber, type: m.type, description: m.description, date: m.scheduledDate,
    })),
  };
}

function driverLeaderboard(orders: OrderRow[], drivers: { id: number; name: string; rating: unknown }[]) {
  const since = Date.now() - 30 * DAY;
  return drivers
    .map((d) => {
      const mine = orders.filter((o) => o.driverId === d.id && o.createdAt.getTime() >= since);
      const delivered = mine.filter((o) => o.status === 'DELIVERED');
      const finished = mine.filter((o) => ['DELIVERED', 'FAILED', 'RETURNED'].includes(o.status));
      return {
        id: d.id, name: d.name, deliveries: delivered.length,
        onTime: pct(delivered.filter(isOnTime).length, delivered.length),
        success: pct(delivered.length, finished.length),
        rating: Math.round(num(d.rating) * 10) / 10,
        active: mine.filter((o) => ['DISPATCHED', 'IN_TRANSIT'].includes(o.status)).length,
      };
    })
    .sort((a, b) => b.deliveries - a.deliveries);
}

function topProducts(orders: OrderRow[]) {
  const map = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === 'CANCELLED') continue;
    for (const i of o.items) {
      const p = map.get(i.itemName) || { name: i.itemName, units: 0, revenue: 0 };
      p.units += i.quantity;
      p.revenue += num(i.totalPrice);
      map.set(i.itemName, p);
    }
  }
  return Array.from(map.values()).map((p) => ({ ...p, revenue: Math.round(p.revenue) }));
}

function topCustomers(orders: OrderRow[]) {
  const map = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const o of orders) {
    if (o.status !== 'DELIVERED') continue;
    const c = map.get(o.customerName) || { name: o.customerName, orders: 0, revenue: 0 };
    c.orders++;
    c.revenue += num(o.totalAmount);
    map.set(o.customerName, c);
  }
  return Array.from(map.values()).map((c) => ({ ...c, revenue: Math.round(c.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
}

async function recentActivity(limit = 8) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, userName: true, action: true, entityType: true, entityId: true, summary: true, createdAt: true },
  });
}

// ---------------------------------------------------------------------------
// Role dashboards
// ---------------------------------------------------------------------------

export async function adminDashboard() {
  const orders = await loadOrders(new Date(Date.now() - 90 * DAY));
  const m = orderMetrics(orders);
  const [inventory, fleet, pendingUsers, activeUsers, activity] = await Promise.all([
    inventoryMetrics(),
    fleetMetrics(),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    recentActivity(),
  ]);
  const revenue30 = m.revenue(m.last30);
  const revenueSeries = dailySeries(30, orders.filter((o) => o.status === 'DELIVERED'), (o) => o.deliveredAt, (o) => num(o.totalAmount));
  const orderSeries = dailySeries(30, orders, (o) => o.createdAt);

  return {
    hero: {
      label: 'Revenue this month',
      value: Math.round(revenue30),
      change: change(revenue30, m.revenue(m.prev30)),
      caption: `${m.last30.filter((o) => o.status === 'DELIVERED').length} delivered orders in the last 30 days`,
      series: revenueSeries.map((d) => d.value),
    },
    stats: {
      orders: { value: m.last7.length, change: change(m.last7.length, m.prev7.length), trend: orderSeries.slice(-14).map((d) => d.value) },
      revenue: { value: Math.round(m.revenue(m.last7)), change: change(m.revenue(m.last7), m.revenue(m.prev7)), trend: revenueSeries.slice(-14).map((d) => d.value) },
      onTime: { value: m.onTime30, change: Math.round((m.onTime30 - m.onTimePrev30) * 10) / 10, trend: m.onTimeTrend.map((w) => w.onTime) },
      activeDrivers: { value: fleet.drivers.filter((d) => d.status !== 'OFF_DUTY').length, total: fleet.drivers.length },
      lowStock: { value: inventory.lowStockCount + inventory.outOfStockCount },
      pendingUsers: { value: pendingUsers, activeUsers },
      scheduledToday: m.scheduledToday.length,
    },
    charts: {
      revenueTrend: revenueSeries.map((d, i) => ({ label: d.label, revenue: d.value, orders: orderSeries[i].value })),
      statusMix: m.statusMix,
      priorityMix: m.priorityMix,
      byWeekday: m.byWeekday,
      onTimeTrend: m.onTimeTrend,
      topCustomers: topCustomers(m.last30),
      topProducts: topProducts(m.last30).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      paymentMix: m.paymentMix,
      inventoryByCategory: inventory.byCategory,
      stockByWarehouse: inventory.byWarehouse,
      vehicleStatus: fleet.vehicleStatus,
      driverStatus: fleet.driverStatus,
      leaderboard: driverLeaderboard(orders, fleet.drivers).slice(0, 6),
      areaMix: m.areaMix,
    },
    lists: { atRisk: m.atRisk, activity, restock: inventory.restockList.slice(0, 5) },
  };
}

export async function warehouseDashboard() {
  const orders = await loadOrders(new Date(Date.now() - 60 * DAY));
  const m = orderMetrics(orders);
  const inventory = await inventoryMetrics();
  const unitsShipped = (rows: OrderRow[]) => rows.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);
  const shippedSeries = dailySeries(14, orders.filter((o) => o.status !== 'CANCELLED'), (o) => o.createdAt, (o) => o.items.reduce((a, i) => a + i.quantity, 0));
  const toPick = orders.filter((o) => o.status === 'PENDING');

  return {
    hero: {
      label: 'Items that need restocking',
      value: inventory.lowStockCount + inventory.outOfStockCount,
      change: null,
      caption: `${inventory.outOfStockCount} out of stock · ${inventory.lowStockCount} below minimum`,
      series: inventory.stockFlow.map((d) => d.stockOut),
    },
    stats: {
      skus: { value: inventory.totalSkus },
      stockValue: { value: inventory.stockValue },
      unitsShipped: { value: unitsShipped(m.last7), change: change(unitsShipped(m.last7), unitsShipped(m.prev7)), trend: shippedSeries.map((d) => d.value) },
      toPick: { value: toPick.length },
      expiring: { value: inventory.expiringSoon },
      openPOs: { value: inventory.openPurchaseOrders },
    },
    charts: {
      stockFlow: inventory.stockFlow,
      inventoryByCategory: inventory.byCategory,
      stockByWarehouse: inventory.byWarehouse,
      topMovers: topProducts(m.last30).sort((a, b) => b.units - a.units).slice(0, 7),
      expiryWeeks: inventory.expiryWeeks,
      purchaseOrderMix: inventory.purchaseOrderMix,
      orderStatus: m.statusMix,
    },
    lists: {
      restock: inventory.restockList,
      expiring: inventory.expiringBatches,
      toPick: toPick.slice(-6).reverse().map((o) => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, priority: o.priority, items: o.items.length })),
    },
  };
}

export async function dispatchDashboard() {
  const orders = await loadOrders(new Date(Date.now() - 60 * DAY));
  const m = orderMetrics(orders);
  const fleet = await fleetMetrics();
  const dispatched = dailySeries(14, orders.filter((o) => o.status !== 'PENDING' && o.status !== 'CANCELLED'), (o) => o.timeSlotStart || o.scheduledDate);
  const delivered = dailySeries(14, orders.filter((o) => o.status === 'DELIVERED'), (o) => o.deliveredAt);
  const failed7 = m.last7.filter((o) => o.status === 'FAILED').length;
  const failedPrev7 = m.prev7.filter((o) => o.status === 'FAILED').length;
  const remainingToday = m.scheduledToday.filter((o) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(o.status));

  return {
    hero: {
      label: 'Deliveries scheduled today',
      value: m.scheduledToday.length,
      change: null,
      caption: `${remainingToday.length} still to go · ${m.scheduledToday.length - remainingToday.length} completed`,
      series: dispatched.map((d) => d.value),
    },
    stats: {
      inTransit: { value: orders.filter((o) => o.status === 'IN_TRANSIT').length },
      pending: { value: orders.filter((o) => o.status === 'PENDING').length },
      onTime: { value: m.onTime30, change: Math.round((m.onTime30 - m.onTimePrev30) * 10) / 10, trend: m.onTimeTrend.map((w) => w.onTime) },
      availableDrivers: { value: fleet.availableDrivers, total: fleet.drivers.length },
      availableVehicles: { value: fleet.availableVehicles, total: fleet.vehicleCount },
      failed: { value: failed7, change: change(failed7, failedPrev7) },
    },
    charts: {
      dispatchVolume: dispatched.map((d, i) => ({ label: d.label, dispatched: d.value, delivered: delivered[i].value })),
      byHour: m.byHour,
      driverWorkload: driverLeaderboard(orders, fleet.drivers).slice(0, 8),
      statusMix: m.statusMix,
      onTimeTrend: m.onTimeTrend,
      areaMix: m.areaMix,
      vehicleStatus: fleet.vehicleStatus,
      failureReasons: m.failureReasons,
    },
    lists: { atRisk: m.atRisk, maintenance: fleet.upcomingMaintenance },
  };
}

export async function driverDashboard(userId: number) {
  const driver = await prisma.driver.findUnique({ where: { userId }, select: { id: true, name: true, rating: true, status: true } });
  if (!driver) return { driver: null };
  const orders = await loadOrders(new Date(Date.now() - 60 * DAY), { driverId: driver.id });
  const m = orderMetrics(orders);
  const allDrivers = await prisma.driver.findMany({ select: { id: true, name: true, rating: true } });
  const fleetOrders = await loadOrders(new Date(Date.now() - 30 * DAY), { driverId: { not: null } });
  const board = driverLeaderboard(fleetOrders, allDrivers);
  const rank = board.findIndex((d) => d.id === driver.id) + 1;
  const deliveredSeries = dailySeries(14, orders.filter((o) => o.status === 'DELIVERED'), (o) => o.deliveredAt);
  const today = startOfDay().getTime();
  const completedToday = orders.filter((o) => o.status === 'DELIVERED' && o.deliveredAt && o.deliveredAt.getTime() >= today).length;
  const route = orders
    .filter((o) => ['DISPATCHED', 'IN_TRANSIT'].includes(o.status) || (o.status === 'PENDING' && o.driverId))
    .sort((a, b) => (a.timeSlotStart?.getTime() || 0) - (b.timeSlotStart?.getTime() || 0))
    .map((o) => ({
      id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, address: o.deliveryAddress, status: o.status, priority: o.priority,
      slotStart: o.timeSlotStart, slotEnd: o.timeSlotEnd, latitude: num(o.latitude) || null, longitude: num(o.longitude) || null,
    }));
  const ratings = await prisma.customerRating.findMany({ where: { driverId: driver.id }, select: { rating: true } });
  const ratingMix = [5, 4, 3, 2, 1].map((stars) => ({ name: `${stars}★`, value: ratings.filter((r) => r.rating === stars).length }));
  const delivered30 = m.last30.filter((o) => o.status === 'DELIVERED');

  return {
    driver,
    hero: {
      label: 'Deliveries left today',
      value: route.length,
      change: null,
      caption: `${completedToday} completed today · rank #${rank || '-'} of ${board.length} drivers this month`,
      series: deliveredSeries.map((d) => d.value),
    },
    stats: {
      completedToday: { value: completedToday },
      week: { value: m.last7.filter((o) => o.status === 'DELIVERED').length, change: change(m.last7.filter((o) => o.status === 'DELIVERED').length, m.prev7.filter((o) => o.status === 'DELIVERED').length), trend: deliveredSeries.map((d) => d.value) },
      onTime: { value: m.onTime30, trend: m.onTimeTrend.map((w) => w.onTime) },
      rating: { value: Math.round(num(driver.rating) * 10) / 10, count: ratings.length },
      deliveredValue: { value: Math.round(delivered30.reduce((s, o) => s + num(o.totalAmount), 0)) },
      rank: { value: rank, of: board.length },
    },
    charts: {
      deliveries: deliveredSeries,
      onTimeSplit: [
        { name: 'On time', value: delivered30.filter(isOnTime).length },
        { name: 'Late', value: delivered30.length - delivered30.filter(isOnTime).length },
      ],
      byHour: m.byHour,
      ratingMix,
      leaderboard: board.slice(0, 5).map((d) => ({ ...d, me: d.id === driver.id })),
    },
    lists: { route },
  };
}
