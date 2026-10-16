import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ReportsController {
  /**
   * Reports page: everything for one period (and a comparison with the period
   * just before it). Query: startDate, endDate (YYYY-MM-DD, Kigali days) and
   * groupBy = day | week | month (picked from the range length if omitted).
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const KIGALI = 2 * 3600000;
      const DAY = 86400000;
      const parseDay = (v: unknown, fallback: Date) => {
        const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : fallback;
        return new Date(d.getTime() - KIGALI); // Kigali midnight in UTC
      };
      const todayKigali = new Date(Math.floor((Date.now() + KIGALI) / DAY) * DAY);
      const start = parseDay(req.query.startDate, new Date(todayKigali.getTime() - 29 * DAY));
      const end = new Date(parseDay(req.query.endDate, todayKigali).getTime() + DAY); // exclusive
      if (end <= start) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_RANGE', message: 'End date must be after start date' } });
      }
      const span = end.getTime() - start.getTime();
      const days = Math.round(span / DAY);
      const groupBy = ['day', 'week', 'month'].includes(String(req.query.groupBy))
        ? String(req.query.groupBy)
        : days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
      const prevStart = new Date(start.getTime() - span);

      const orderSelect = {
        id: true, status: true, totalAmount: true, createdAt: true, deliveredAt: true, slaDeadline: true, timeSlotEnd: true,
        driverId: true, vehicleId: true, customerName: true, driver: { select: { name: true } },
      } as const;
      const [orders, prevOrders, deliveredInRange, prevDelivered, ratings, prevRatings, inventory, drivers, vehicles] = await Promise.all([
        prisma.deliveryOrder.findMany({ where: { createdAt: { gte: start, lt: end } }, select: orderSelect }),
        prisma.deliveryOrder.findMany({ where: { createdAt: { gte: prevStart, lt: start } }, select: { id: true, status: true } }),
        prisma.deliveryOrder.findMany({ where: { status: 'DELIVERED', deliveredAt: { gte: start, lt: end } }, select: orderSelect }),
        prisma.deliveryOrder.findMany({ where: { status: 'DELIVERED', deliveredAt: { gte: prevStart, lt: start } }, select: { totalAmount: true, createdAt: true, deliveredAt: true } }),
        prisma.customerRating.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { rating: true } }),
        prisma.customerRating.findMany({ where: { createdAt: { gte: prevStart, lt: start } }, select: { rating: true } }),
        prisma.inventoryItem.findMany({ select: { category: true, quantity: true, unitPrice: true, minQuantity: true } }),
        prisma.driver.findMany({ select: { id: true, status: true, rating: true } }),
        prisma.vehicle.findMany({ select: { id: true, status: true } }),
      ]);

      const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
      const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 1000) / 10 : now ? 100 : 0);
      const sum = (list: { totalAmount: any }[]) => list.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
      const avgHours = (list: { createdAt: Date; deliveredAt: Date | null }[]) => {
        const times = list.filter((o) => o.deliveredAt).map((o) => (o.deliveredAt!.getTime() - o.createdAt.getTime()) / 3600000).filter((h) => h >= 0);
        return times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : 0;
      };
      const avg = (list: { rating: number }[]) => (list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : 0);

      // On time: delivered before the SLA deadline (or the end of the delivery window)
      const withDeadline = deliveredInRange.filter((o) => o.slaDeadline || o.timeSlotEnd);
      const onTime = withDeadline.filter((o) => o.deliveredAt! <= (o.slaDeadline || o.timeSlotEnd)!).length;

      // Buckets in Kigali time
      const bucketStart = (t: number) => {
        const k = new Date(t + KIGALI);
        const day = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
        if (groupBy === 'month') return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1);
        if (groupBy === 'week') return day - ((k.getUTCDay() + 6) % 7) * DAY; // Monday
        return day;
      };
      const next = (b: number) => {
        if (groupBy === 'month') { const d = new Date(b); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
        return b + (groupBy === 'week' ? 7 : 1) * DAY;
      };
      const label = (b: number) => {
        const d = new Date(b);
        if (groupBy === 'month') return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
        if (groupBy === 'week') return `Wk ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      };
      const buckets = new Map<number, any>();
      for (let b = bucketStart(start.getTime()); b < end.getTime() + KIGALI; b = next(b)) {
        buckets.set(b, { date: new Date(b).toISOString().slice(0, 10), label: label(b), orders: 0, delivered: 0, pending: 0, inTransit: 0, failed: 0, cancelled: 0, revenue: 0 });
      }
      for (const o of orders) {
        const row = buckets.get(bucketStart(o.createdAt.getTime()));
        if (!row) continue;
        row.orders += 1;
        if (o.status === 'PENDING') row.pending += 1;
        else if (o.status === 'DISPATCHED' || o.status === 'IN_TRANSIT') row.inTransit += 1;
        else if (o.status === 'FAILED' || o.status === 'RETURNED') row.failed += 1;
        else if (o.status === 'CANCELLED') row.cancelled += 1;
      }
      for (const o of deliveredInRange) {
        const row = buckets.get(bucketStart(o.deliveredAt!.getTime()));
        if (!row) continue;
        row.delivered += 1;
        row.revenue += Number(o.totalAmount || 0);
      }

      const statusCounts = new Map<string, number>();
      for (const o of orders) statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);

      const categories = new Map<string, { category: string; count: number; totalQuantity: number; value: number; lowStock: number }>();
      for (const i of inventory) {
        const c = categories.get(i.category) || { category: i.category, count: 0, totalQuantity: 0, value: 0, lowStock: 0 };
        c.count += 1;
        c.totalQuantity += i.quantity;
        c.value += i.quantity * Number(i.unitPrice || 0);
        if (i.quantity <= i.minQuantity) c.lowStock += 1;
        categories.set(i.category, c);
      }

      const byDriver = new Map<string, { name: string; delivered: number; revenue: number }>();
      for (const o of deliveredInRange) {
        if (!o.driver) continue;
        const d = byDriver.get(o.driver.name) || { name: o.driver.name, delivered: 0, revenue: 0 };
        d.delivered += 1;
        d.revenue += Number(o.totalAmount || 0);
        byDriver.set(o.driver.name, d);
      }
      const byCustomer = new Map<string, { name: string; orders: number; revenue: number }>();
      for (const o of deliveredInRange) {
        const c = byCustomer.get(o.customerName) || { name: o.customerName, orders: 0, revenue: 0 };
        c.orders += 1;
        c.revenue += Number(o.totalAmount || 0);
        byCustomer.set(o.customerName, c);
      }

      const activeDriverIds = new Set(orders.map((o) => o.driverId).filter(Boolean));
      const usedVehicles = new Set([...orders, ...deliveredInRange].map((o) => o.vehicleId).filter(Boolean));
      const fleet = vehicles.filter((v) => v.status !== 'UNAVAILABLE').length;
      const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
      const prevDeliveredCount = prevOrders.filter((o) => o.status === 'DELIVERED').length;
      const revenue = sum(deliveredInRange);
      const prevRevenue = sum(prevDelivered);
      const avgDeliveryHours = avgHours(deliveredInRange);
      const prevAvgHours = avgHours(prevDelivered);
      const driverRatings = drivers.map((d) => Number(d.rating || 0)).filter((r) => r > 0);
      const satisfaction = avg(ratings) || (driverRatings.length ? Math.round((driverRatings.reduce((a, b) => a + b, 0) / driverRatings.length) * 10) / 10 : 0);

      res.json({
        success: true,
        data: {
          period: { startDate: new Date(start.getTime() + KIGALI).toISOString().slice(0, 10), endDate: new Date(end.getTime() + KIGALI - DAY).toISOString().slice(0, 10), groupBy, days },
          summary: {
            totalOrders: orders.length,
            ordersChange: change(orders.length, prevOrders.length),
            delivered,
            deliveredInPeriod: deliveredInRange.length,
            deliveryRate: pct(delivered, orders.length),
            deliveryRateChange: Math.round((pct(delivered, orders.length) - pct(prevDeliveredCount, prevOrders.length)) * 10) / 10,
            revenue,
            revenueChange: change(revenue, prevRevenue),
            avgDeliveryHours,
            avgDeliveryHoursChange: Math.round((avgDeliveryHours - prevAvgHours) * 10) / 10,
            // Kept for older clients (days)
            avgDeliveryTime: Math.round((avgDeliveryHours / 24) * 10) / 10,
            failed: orders.filter((o) => o.status === 'FAILED' || o.status === 'RETURNED').length,
            pending: orders.filter((o) => o.status === 'PENDING').length,
            activeDrivers: activeDriverIds.size,
            availableDrivers: drivers.filter((d) => d.status === 'AVAILABLE').length,
            totalDrivers: drivers.length,
          },
          kpis: {
            onTimeDeliveryRate: pct(onTime, withDeadline.length),
            onTimeSample: withDeadline.length,
            customerSatisfaction: satisfaction,
            customerSatisfactionChange: Math.round((avg(ratings) - avg(prevRatings)) * 10) / 10,
            ratingsCount: ratings.length,
            fleetUtilization: pct(usedVehicles.size, fleet),
            vehiclesUsed: usedVehicles.size,
            fleetSize: fleet,
          },
          trends: [...buckets.values()],
          statusDistribution: [...statusCounts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
          inventoryByCategory: [...categories.values()].sort((a, b) => b.value - a.value),
          topDrivers: [...byDriver.values()].sort((a, b) => b.delivered - a.delivered).slice(0, 8),
          topCustomers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
        },
      });
    } catch (error) {
      console.error('Analytics report error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getSalesReport(req: Request, res: Response) {
    try {
      const orders = await prisma.deliveryOrder.findMany({
        include: { items: { include: { item: true } } }
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getInventoryReport(req: Request, res: Response) {
    try {
      const inventory = await prisma.inventoryItem.findMany();
      res.json({ success: true, data: inventory });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getVehiclesReport(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany();
      res.json({ success: true, data: vehicles });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriversReport(req: Request, res: Response) {
    try {
      const drivers = await prisma.driver.findMany({ include: { user: true } });
      res.json({ success: true, data: drivers });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async exportReport(req: Request, res: Response) {
    try {
      const { type } = req.body;
      res.json({ success: true, message: `Export ${type} report functionality` });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}
