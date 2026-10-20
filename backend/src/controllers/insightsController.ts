import { Request, Response, NextFunction } from 'express';
import { adminDashboard, warehouseDashboard, dispatchDashboard, driverDashboard } from '../services/insightsService';
import { prisma } from '../lib/prisma';

// Short cache so several widgets / quick refreshes don't recompute everything
const CACHE_MS = 30 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

export class InsightsController {
  /** Everything one role's dashboard needs, in a single response. */
  static async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role;
      const userId = Number(req.user!.userId);
      // Cached dashboard results contain company and branch data. Include the
      // selected tenant in every key to prevent one membership seeing another's
      // cached dashboard during the 30 second refresh window.
      const key = `${req.user!.companyId}:${req.user!.branchId ?? 'all'}:${role}:${role === 'DRIVER' ? userId : ''}`;
      const cached = cache.get(key);
      if (cached && Date.now() - cached.at < CACHE_MS && req.query.fresh !== '1') {
        return res.json({ success: true, data: cached.data, cached: true });
      }

      let data: unknown;
      switch (role) {
        case 'ADMIN': data = await adminDashboard(); break;
        case 'WAREHOUSE_STAFF': data = await warehouseDashboard(); break;
        case 'DISPATCH_OFFICER': data = await dispatchDashboard(); break;
        case 'DRIVER': data = await driverDashboard(userId); break;
        default: data = {};
      }
      cache.set(key, { at: Date.now(), data });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** One tenant-scoped queue of the issues that need an operations owner. */
  static async commandCenter(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [orders, lowStock, cash, feedback, apiErrors, submittedCounts, requestedReturns, discrepancies] = await Promise.all([
        prisma.deliveryOrder.findMany({
          where: {
            status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'FAILED'] },
            OR: [
              { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] }, slaDeadline: { lte: soon } },
              { status: 'PENDING', driverId: null },
              { status: 'FAILED' },
            ],
          },
          select: { id: true, orderNumber: true, customerName: true, status: true, slaDeadline: true, driverId: true, updatedAt: true },
          orderBy: [{ slaDeadline: 'asc' }, { updatedAt: 'asc' }], take: 50,
        }),
        prisma.inventoryItem.findMany({
          where: { status: 'ACTIVE', quantity: { lte: prisma.inventoryItem.fields.minQuantity } },
          select: { id: true, name: true, code: true, quantity: true, minQuantity: true },
          orderBy: { quantity: 'asc' }, take: 30,
        }),
        prisma.payment.groupBy({
          by: ['collectedByDriverId'],
          where: { provider: 'CASH', status: 'SUCCESSFUL', handoverId: null, collectedByDriverId: { not: null } },
          _sum: { amount: true }, _count: { _all: true }, _min: { completedAt: true },
        }),
        prisma.feedbackReport.findMany({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } }, select: { id: true, category: true, message: true, createdAt: true, order: { select: { id: true, orderNumber: true } } }, orderBy: { createdAt: 'asc' }, take: 20 }),
        prisma.usageEvent.count({ where: { event: 'API_ERROR', createdAt: { gte: since } } }),
        prisma.stockCount.findMany({ where: { status: 'SUBMITTED' }, select: { id: true, countNumber: true, title: true, submittedAt: true }, orderBy: { submittedAt: 'asc' }, take: 20 }),
        prisma.returnRequest.findMany({ where: { status: 'REQUESTED' }, select: { id: true, returnNumber: true, reason: true, createdAt: true, order: { select: { orderNumber: true } } }, orderBy: { createdAt: 'asc' }, take: 20 }),
        prisma.cashHandover.findMany({ where: { status: { in: ['SHORT', 'OVER'] }, createdAt: { gte: since } }, select: { id: true, handoverNumber: true, status: true, expected: true, received: true, difference: true, createdAt: true, driver: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      ]);
      const driverIds = cash.map((row) => row.collectedByDriverId).filter((id): id is number => id !== null);
      const drivers = await prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } });
      const names = new Map(drivers.map((driver) => [driver.id, driver.name]));
      res.json({ success: true, data: {
        generatedAt: now,
        orders: orders.map((order) => ({ ...order, issue: order.status === 'FAILED' ? 'DELIVERY_FAILED' : !order.driverId && order.status === 'PENDING' ? 'UNASSIGNED' : order.slaDeadline && order.slaDeadline < now ? 'LATE' : 'AT_RISK' })),
        lowStock,
        cash: cash.map((row) => ({ driverId: row.collectedByDriverId, driverName: names.get(row.collectedByDriverId!) || 'Driver', amount: Number(row._sum.amount || 0), deliveries: row._count._all, since: row._min.completedAt, overdue: Boolean(row._min.completedAt && row._min.completedAt < since) })),
        feedback,
        approvals: { stockCounts: submittedCounts, returns: requestedReturns, cashDiscrepancies: discrepancies },
        apiErrorsLast24Hours: apiErrors,
      } });
    } catch (error) {
      next(error);
    }
  }

  /** Saved dashboard layout (card order and hidden cards) for the current user. */
  static async getLayout(req: Request, res: Response, next: NextFunction) {
    try {
      const prefs = await prisma.userPreferences.findUnique({ where: { userId: Number(req.user!.userId) } });
      res.json({ success: true, data: prefs?.dashboardLayout ?? null });
    } catch (error) {
      next(error);
    }
  }

  static async saveLayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { order, hidden } = req.body || {};
      if (!Array.isArray(order) || !Array.isArray(hidden) || order.length > 50 || hidden.length > 50) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'order and hidden must be lists of card ids' } });
      }
      const layout = { order: order.map(String).slice(0, 50), hidden: hidden.map(String).slice(0, 50) };
      const userId = Number(req.user!.userId);
      await prisma.userPreferences.upsert({
        where: { userId },
        update: { dashboardLayout: layout },
        create: { userId, dashboardLayout: layout },
      });
      res.json({ success: true, data: layout });
    } catch (error) {
      next(error);
    }
  }
}
