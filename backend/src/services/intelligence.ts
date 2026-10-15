import { prisma } from '../lib/prisma';

const DAY = 86400000;
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Demand forecast per item from the last 90 days of shipped units:
 * weekday-seasonal average with a linear trend (recent 30 days vs prior 30).
 */
export async function forecastDemand(options: { itemId?: number; horizon?: number } = {}) {
  const horizon = Math.min(Math.max(options.horizon || 30, 7), 90);
  const since = new Date(Date.now() - 90 * DAY);
  const [items, lines, suppliers] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE', ...(options.itemId && { id: options.itemId }) },
      select: { id: true, name: true, code: true, category: true, unit: true, quantity: true, minQuantity: true, supplier: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: since }, status: { not: 'CANCELLED' } }, ...(options.itemId && { itemId: options.itemId }) },
      select: { itemId: true, quantity: true, order: { select: { createdAt: true } } },
    }),
    prisma.supplier.findMany({ select: { name: true, leadTimeDays: true } }),
  ]);

  return items
    .map((item) => {
      const mine = lines.filter((l) => l.itemId === item.id);
      const daily = new Map<string, number>();
      for (const l of mine) {
        const k = l.order.createdAt.toISOString().slice(0, 10);
        daily.set(k, (daily.get(k) || 0) + l.quantity);
      }
      const total90 = mine.reduce((s, l) => s + l.quantity, 0);
      const now = Date.now();
      const last30 = mine.filter((l) => l.order.createdAt.getTime() >= now - 30 * DAY).reduce((s, l) => s + l.quantity, 0);
      const prev30 = mine.filter((l) => l.order.createdAt.getTime() >= now - 60 * DAY && l.order.createdAt.getTime() < now - 30 * DAY).reduce((s, l) => s + l.quantity, 0);
      const avgDaily = total90 / 90;
      const trend = prev30 > 0 ? Math.max(-0.5, Math.min(1, (last30 - prev30) / prev30)) : last30 > 0 ? 0.2 : 0;

      // Weekday factors (Sunday is quieter, Saturday busier, etc.)
      const byWeekday = Array(7).fill(0);
      const weekdayCount = Array(7).fill(0);
      for (let i = 0; i < 90; i++) {
        const d = new Date(now - i * DAY);
        const k = d.toISOString().slice(0, 10);
        byWeekday[d.getDay()] += daily.get(k) || 0;
        weekdayCount[d.getDay()]++;
      }
      const weekdayAvg = byWeekday.map((v, i) => v / Math.max(1, weekdayCount[i]));
      const overall = weekdayAvg.reduce((s, v) => s + v, 0) / 7 || 1;
      const factor = weekdayAvg.map((v) => (overall ? v / overall : 1));

      const forecast = Array.from({ length: horizon }, (_, i) => {
        const date = new Date(now + (i + 1) * DAY);
        const growth = 1 + (trend * (i + 1)) / 30;
        return { date: date.toISOString().slice(0, 10), demand: round(Math.max(0, avgDaily * (factor[date.getDay()] || 1) * growth), 1) };
      });
      const next30 = forecast.slice(0, 30).reduce((s, f) => s + f.demand, 0);
      const dailyForward = next30 / Math.min(30, horizon);
      const leadTime = suppliers.find((s) => item.supplier && s.name.toLowerCase() === item.supplier.toLowerCase())?.leadTimeDays ?? 7;
      const safetyStock = Math.ceil(dailyForward * Math.max(3, leadTime * 0.5));
      const reorderPoint = Math.ceil(dailyForward * leadTime + safetyStock);
      const daysOfCover = dailyForward > 0 ? Math.floor(item.quantity / dailyForward) : null;
      const suggestedOrder = item.quantity <= reorderPoint ? Math.max(0, Math.ceil(dailyForward * (leadTime + 30) + safetyStock - item.quantity)) : 0;

      return {
        ...item,
        avgDailyDemand: round(avgDaily, 2),
        trendPercent: round(trend * 100, 0),
        next7: round(forecast.slice(0, 7).reduce((s, f) => s + f.demand, 0), 0),
        next30: round(next30, 0),
        daysOfCover,
        leadTimeDays: leadTime,
        reorderPoint,
        safetyStock,
        suggestedOrder,
        risk: daysOfCover === null ? 'none' : daysOfCover <= leadTime ? 'high' : daysOfCover <= leadTime * 2 ? 'medium' : 'low',
        history: Array.from({ length: 30 }, (_, i) => {
          const d = new Date(now - (29 - i) * DAY).toISOString().slice(0, 10);
          return { date: d, demand: daily.get(d) || 0 };
        }),
        forecast,
      };
    })
    .sort((a, b) => (a.daysOfCover ?? 9999) - (b.daysOfCover ?? 9999));
}

/** Per-driver performance over a period. */
export async function driverScorecards(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const [drivers, orders, ratings, dispatches] = await Promise.all([
    prisma.driver.findMany({ select: { id: true, name: true, status: true, rating: true, experience: true, currentVehicle: { select: { plateNumber: true, type: true } } } }),
    prisma.deliveryOrder.findMany({
      where: { driverId: { not: null }, createdAt: { gte: since } },
      select: { driverId: true, status: true, totalAmount: true, deliveredAt: true, slaDeadline: true, timeSlotStart: true },
    }),
    prisma.customerRating.findMany({ where: { createdAt: { gte: since } }, select: { driverId: true, rating: true } }),
    prisma.dispatch.findMany({ where: { createdAt: { gte: since } }, select: { driverId: true, fuelAllowance: true, dispatchedAt: true, actualDelivery: true } }),
  ]);

  return drivers
    .map((d) => {
      const mine = orders.filter((o) => o.driverId === d.id);
      const delivered = mine.filter((o) => o.status === 'DELIVERED');
      const finished = mine.filter((o) => ['DELIVERED', 'FAILED', 'RETURNED'].includes(o.status));
      const onTime = delivered.filter((o) => o.deliveredAt && (!o.slaDeadline || o.deliveredAt <= o.slaDeadline)).length;
      const myRatings = ratings.filter((r) => r.driverId === d.id);
      const myDispatches = dispatches.filter((x) => x.driverId === d.id);
      const durations = myDispatches
        .filter((x) => x.dispatchedAt && x.actualDelivery && x.actualDelivery > x.dispatchedAt)
        .map((x) => (x.actualDelivery!.getTime() - x.dispatchedAt!.getTime()) / 60000);
      const fuel = myDispatches.reduce((s, x) => s + Number(x.fuelAllowance || 0), 0);
      const onTimeRate = delivered.length ? (onTime / delivered.length) * 100 : 0;
      const successRate = finished.length ? (delivered.length / finished.length) * 100 : 0;
      const avgRating = myRatings.length ? myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length : Number(d.rating) || 0;
      // Weighted overall score out of 100
      const score = delivered.length ? onTimeRate * 0.4 + successRate * 0.3 + (avgRating / 5) * 100 * 0.3 : 0;
      return {
        id: d.id, name: d.name, status: d.status, vehicle: d.currentVehicle?.plateNumber || null, experience: d.experience,
        deliveries: delivered.length, failed: mine.filter((o) => o.status === 'FAILED').length,
        onTimeRate: round(onTimeRate), successRate: round(successRate), rating: round(avgRating), ratingsCount: myRatings.length,
        avgDeliveryMinutes: durations.length ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : null,
        revenue: Math.round(delivered.reduce((s, o) => s + Number(o.totalAmount), 0)),
        fuelAllowance: Math.round(fuel),
        fuelPerDelivery: delivered.length ? Math.round(fuel / delivered.length) : null,
        score: round(score, 0),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface Anomaly {
  type: 'STOCK_DROP' | 'DRIVER_IDLE' | 'ORDER_STUCK' | 'SLA_BREACH';
  severity: 'WARNING' | 'ERROR';
  title: string;
  message: string;
  entityType: string;
  entityId: number;
}

/** Unusual patterns worth a human look. */
export async function detectAnomalies(): Promise<Anomaly[]> {
  const now = Date.now();
  const anomalies: Anomaly[] = [];

  // 1. Stock drops far above normal daily movement (mean + 3σ over 30 days)
  const history = await prisma.inventoryHistory.findMany({
    where: { action: 'stock_out', performedAt: { gte: new Date(now - 31 * DAY) } },
    select: { itemId: true, quantity: true, performedAt: true, item: { select: { name: true } } },
  });
  const perItem = new Map<number, { name: string; days: Map<string, number> }>();
  for (const h of history) {
    const entry = perItem.get(h.itemId) || { name: h.item.name, days: new Map() };
    const k = h.performedAt.toISOString().slice(0, 10);
    entry.days.set(k, (entry.days.get(k) || 0) + h.quantity);
    perItem.set(h.itemId, entry);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const [itemId, { name, days }] of perItem) {
    const values = Array.from({ length: 30 }, (_, i) => days.get(new Date(now - (i + 1) * DAY).toISOString().slice(0, 10)) || 0);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const todayValue = days.get(today) || 0;
    if (todayValue > 5 && todayValue > mean + 3 * Math.max(sd, 1)) {
      anomalies.push({
        type: 'STOCK_DROP', severity: 'WARNING', entityType: 'InventoryItem', entityId: itemId,
        title: `Unusual stock drop: ${name}`,
        message: `${todayValue} units left today, versus a normal ${round(mean)} per day. Check for picking errors or loss.`,
      });
    }
  }

  // 2. On-duty drivers with active deliveries but no location update for 2+ hours
  const idle = await prisma.driver.findMany({
    where: { status: 'ON_DUTY', lastLocationAt: { lt: new Date(now - 2 * 3600000) }, orders: { some: { status: 'IN_TRANSIT' } } },
    select: { id: true, name: true, lastLocationAt: true },
  });
  for (const d of idle) {
    anomalies.push({
      type: 'DRIVER_IDLE', severity: 'WARNING', entityType: 'Driver', entityId: d.id,
      title: `${d.name} hasn't moved in a while`,
      message: `No location update for ${Math.round((now - d.lastLocationAt!.getTime()) / 3600000)} hours while a delivery is in transit.`,
    });
  }

  // 3. Orders stuck: dispatched > 24h without starting, or in transit > 8h
  const stuck = await prisma.deliveryOrder.findMany({
    where: {
      OR: [
        { status: 'DISPATCHED', updatedAt: { lt: new Date(now - 24 * 3600000) } },
        { status: 'IN_TRANSIT', updatedAt: { lt: new Date(now - 8 * 3600000) } },
      ],
    },
    select: { id: true, orderNumber: true, status: true, updatedAt: true },
    take: 20,
  });
  for (const o of stuck) {
    anomalies.push({
      type: 'ORDER_STUCK', severity: 'ERROR', entityType: 'Order', entityId: o.id,
      title: `${o.orderNumber} is stuck`,
      message: `${o.status.replace('_', ' ').toLowerCase()} for ${Math.round((now - o.updatedAt.getTime()) / 3600000)} hours without progress.`,
    });
  }

  return anomalies;
}
