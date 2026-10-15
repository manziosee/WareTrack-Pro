import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { auth } from '../middleware/auth';

/** Each user's named table filters, e.g. "High-priority pending orders". */
const router = Router();

router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.savedFilter.findMany({
      where: { userId: Number(req.user!.userId), ...(req.query.page && { page: String(req.query.page) }) },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, name, filters } = req.body || {};
    if (!page || !name || typeof filters !== 'object') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'page, name and filters are required' } });
    }
    const userId = Number(req.user!.userId);
    const count = await prisma.savedFilter.count({ where: { userId, page: String(page) } });
    if (count >= 20) {
      return res.status(400).json({ success: false, error: { code: 'LIMIT_REACHED', message: 'You can save up to 20 filters per page' } });
    }
    const item = await prisma.savedFilter.create({
      data: { userId, page: String(page).slice(0, 40), name: String(name).slice(0, 60), filters },
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.savedFilter.deleteMany({ where: { id: Number(req.params.id), userId: Number(req.user!.userId) } });
    if (!result.count) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Filter not found' } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
