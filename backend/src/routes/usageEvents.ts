import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();
const eventKinds = new Set(['PAGE_VIEW', 'API_ERROR', 'ACTION']);

/** @openapi
 * /api/usage-events:
 *   post:
 *     summary: Record a minimal product usage event for the signed-in staff member
 *     description: Accepts only event kind, normalized route, and allowlisted status/method metadata. Never send customer or form data.
 *     tags: [Product Analytics]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event: { type: string, enum: [PAGE_VIEW, API_ERROR, ACTION] }
 *               route: { type: string, maxLength: 120 }
 *               details: { type: object, properties: { method: { type: string }, status: { type: integer } } }
 *     responses:
 *       201: { description: Event accepted }
 */
router.post('/', authenticateToken, async (req: any, res, next) => {
  try {
    const event = String(req.body?.event || '');
    if (!eventKinds.has(event)) return res.status(400).json({ success: false, error: { message: 'Unsupported usage event' } });
    const route = typeof req.body?.route === 'string'
      ? req.body.route.replace(/[^a-zA-Z0-9_/:.-]/g, '').slice(0, 120) || null
      : null;
    const raw = req.body?.details || {};
    const details: Record<string, string | number> = {};
    if (typeof raw.method === 'string' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(raw.method.toUpperCase())) details.method = raw.method.toUpperCase();
    if (Number.isInteger(raw.status) && raw.status >= 100 && raw.status <= 599) details.status = raw.status;
    await prisma.usageEvent.create({ data: { userId: Number(req.user.userId), event, route, details } });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/usage-events/summary:
 *   get:
 *     summary: View anonymized workflow usage, top routes, and recurring API errors
 *     tags: [Product Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 7, maximum: 90, default: 30 }
 *     responses:
 *       200: { description: Tenant-scoped counts and daily event trend }
 *       403: { description: Usage read permission required }
 */
router.get('/summary', authenticateToken, authorizeRoles('ADMIN'), async (req: any, res, next) => {
  try {
    const days = Math.max(7, Math.min(Number(req.query.days) || 30, 90));
    const since = new Date(); since.setDate(since.getDate() - days);
    const events = await prisma.usageEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { event: true, route: true, details: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 50000,
    });
    const daily: Record<string, { date: string; pageViews: number; actions: number; apiErrors: number }> = {};
    const routeTotals = new Map<string, { pageViews: number; apiErrors: number; actions: number }>();
    for (const item of events) {
      const date = item.createdAt.toISOString().slice(0, 10);
      daily[date] ||= { date, pageViews: 0, actions: 0, apiErrors: 0 };
      const kind = item.event === 'PAGE_VIEW' ? 'pageViews' : item.event === 'API_ERROR' ? 'apiErrors' : 'actions';
      daily[date][kind]++;
      const route = item.route || '(unknown)';
      const totals = routeTotals.get(route) || { pageViews: 0, apiErrors: 0, actions: 0 };
      totals[kind]++;
      routeTotals.set(route, totals);
    }
    res.json({ success: true, data: {
      periodDays: days,
      totals: {
        pageViews: events.filter((e) => e.event === 'PAGE_VIEW').length,
        actions: events.filter((e) => e.event === 'ACTION').length,
        apiErrors: events.filter((e) => e.event === 'API_ERROR').length,
      },
      daily: Object.values(daily),
      routes: [...routeTotals.entries()].map(([route, counts]) => ({ route, ...counts })).sort((a, b) => b.pageViews + b.actions + b.apiErrors - (a.pageViews + a.actions + a.apiErrors)).slice(0, 20),
      truncated: events.length === 50000,
    } });
  } catch (error) { next(error); }
});

export default router;
