import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

/** Full audit log with filters (admins only). */
router.get('/', auth, authorizeRoles(...ROLES.admin), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, userId, action, q, from, to } = req.query;
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const where: any = {
      ...(entityType && { entityType: String(entityType) }),
      ...(entityId && { entityId: String(entityId) }),
      ...(userId && { userId: Number(userId) }),
      ...(action && { action: String(action) }),
      ...(q && { summary: { contains: String(q), mode: 'insensitive' } }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(String(from)) }),
          ...(to && { lte: new Date(String(to)) }),
        },
      }),
    };
    const [items, total, byAction] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip: (page - 1) * take }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({ by: ['action'], where, _count: { _all: true } }),
    ]);
    res.json({
      success: true,
      data: items,
      summary: byAction.map((a) => ({ action: a.action, count: a._count._all })),
      pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

/** Timeline for one record, shown in detail panels. */
router.get('/entity/:entityType/:entityId', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.auditLog.findMany({
      where: { entityType: req.params.entityType, entityId: req.params.entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, userName: true, userRole: true, action: true, summary: true, changes: true, createdAt: true },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

export default router;
