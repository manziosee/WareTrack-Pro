import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();
const categories = ['DELAY', 'DAMAGED_GOODS', 'CUSTOMER_COMPLAINT', 'DRIVER_SAFETY', 'APP_ISSUE', 'STOCK', 'OTHER'];
const statuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
const fail = (res: any, status: number, message: string) => res.status(status).json({ success: false, error: { code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', message } });
const include = {
  order: { select: { id: true, orderNumber: true, customerName: true } },
  submitter: { select: { id: true, name: true, email: true } },
  customer: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  resolver: { select: { id: true, name: true } },
};

/** @openapi
 * /api/feedback:
 *   get:
 *     summary: List feedback reports for the selected company and branch
 *     tags: [Feedback]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reports with linked order, submitter, and assignee }
 *       403: { description: Feedback read permission required }
 *   post:
 *     summary: Submit an internal issue or operational feedback report
 *     tags: [Feedback]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, message]
 *             properties:
 *               orderId: { type: integer }
 *               category: { type: string, enum: [DELAY, DAMAGED_GOODS, CUSTOMER_COMPLAINT, DRIVER_SAFETY, APP_ISSUE, STOCK, OTHER] }
 *               message: { type: string, minLength: 10, maxLength: 4000 }
 *     responses:
 *       201: { description: Report created }
 *       400: { description: Invalid report data }
 *       403: { description: Feedback create permission required }
 */
router.get('/', authenticateToken, authorizeRoles(...ROLES.fleetManagers), async (req: any, res, next) => {
  try {
    const status = String(req.query.status || '');
    const reports = await prisma.feedbackReport.findMany({
      where: status && statuses.includes(status) ? { status } : {},
      include,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(req.query.limit) || 100, 250),
    });
    res.json({ success: true, data: reports });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/feedback/mine:
 *   get:
 *     summary: List reports submitted by the signed-in staff member
 *     tags: [Feedback]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User's reports }
 */
router.get('/mine', authenticateToken, async (req: any, res, next) => {
  try {
    const reports = await prisma.feedbackReport.findMany({
      where: { submittedById: Number(req.user.userId) }, include,
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json({ success: true, data: reports });
  } catch (error) { next(error); }
});

router.post('/', authenticateToken, async (req: any, res, next) => {
  try {
    const category = String(req.body?.category || '');
    const message = String(req.body?.message || '').trim();
    if (!categories.includes(category) || message.length < 10 || message.length > 4000) return fail(res, 400, 'Choose a valid category and provide a message of 10 to 4000 characters');
    const orderId = req.body?.orderId == null ? null : Number(req.body.orderId);
    if (orderId !== null && (!Number.isInteger(orderId) || !(await prisma.deliveryOrder.findFirst({ where: { id: orderId }, select: { id: true } })))) return fail(res, 400, 'Order was not found in the selected company and branch');
    const report = await prisma.feedbackReport.create({ data: {
      kind: 'INTERNAL_ISSUE', category, message, ...(orderId ? { orderId } : {}), submittedById: Number(req.user.userId),
    }, include });
    res.status(201).json({ success: true, data: report });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/feedback/{id}:
 *   patch:
 *     summary: Assign or update the status and resolution of a feedback report
 *     tags: [Feedback]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [OPEN, IN_REVIEW, RESOLVED, DISMISSED] }
 *               resolution: { type: string, maxLength: 4000 }
 *               assignedToId: { type: integer, nullable: true }
 *     responses:
 *       200: { description: Updated report }
 *       404: { description: Report not found in selected tenant }
 */
router.patch('/:id', authenticateToken, authorizeRoles(...ROLES.fleetManagers), async (req: any, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.feedbackReport.findFirst({ where: { id } });
    if (!current) return fail(res, 404, 'Feedback report not found');
    const data: any = {};
    if (req.body?.status !== undefined) {
      if (!statuses.includes(req.body.status)) return fail(res, 400, 'Invalid feedback status');
      data.status = req.body.status;
      if (['RESOLVED', 'DISMISSED'].includes(data.status)) {
        data.resolvedAt = new Date(); data.resolvedById = Number(req.user.userId);
      } else { data.resolvedAt = null; data.resolvedById = null; }
    }
    if (req.body?.resolution !== undefined) {
      if (typeof req.body.resolution !== 'string' || req.body.resolution.length > 4000) return fail(res, 400, 'Resolution must be at most 4000 characters');
      data.resolution = req.body.resolution.trim() || null;
    }
    if (req.body?.assignedToId !== undefined) {
      const assignedToId = req.body.assignedToId === null ? null : Number(req.body.assignedToId);
      if (assignedToId !== null) {
        const membership = await prisma.companyMembership.findFirst({ where: { userId: assignedToId, active: true }, select: { id: true } });
        if (!membership) return fail(res, 400, 'Assignee must be an active member of this company');
      }
      data.assignedToId = assignedToId;
    }
    const report = await prisma.feedbackReport.update({ where: { id }, data, include });
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
});

export default router;
