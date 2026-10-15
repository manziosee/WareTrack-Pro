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
      const key = role === 'DRIVER' ? `driver:${userId}` : role;
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
