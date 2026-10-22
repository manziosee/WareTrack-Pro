import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/emailService';
import { buildSummary, summaryPdf, summaryText, PERIOD_NAMES, type SummaryPeriod } from '../services/summaryReport';

const router = Router();

/**
 * @swagger
 * /api/reports/analytics:
 *   get:
 *     summary: Get analytics overview
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.getAnalytics);

/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     summary: Get sales report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales report retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sales', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.getSalesReport);

/**
 * @swagger
 * /api/reports/inventory:
 *   get:
 *     summary: Get inventory report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory report retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.getInventoryReport);

/**
 * @swagger
 * /api/reports/vehicles:
 *   get:
 *     summary: Get vehicles report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles report retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/vehicles', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.getVehiclesReport);

/**
 * @swagger
 * /api/reports/drivers:
 *   get:
 *     summary: Get drivers report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Drivers report retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/drivers', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.getDriversReport);

/**
 * @swagger
 * /api/reports/export:
 *   post:
 *     summary: Export report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [sales, inventory, vehicles, drivers]
 *     responses:
 *       200:
 *         description: Report exported successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/export', auth, authorizeRoles(...ROLES.orderManagers), ReportsController.exportReport);

const summaryPeriod = (v: unknown): SummaryPeriod | null => (v === undefined || v === '' ? 'day' : ['day', 'week', 'month'].includes(String(v)) ? (v as SummaryPeriod) : null);

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Management summary for the last finished day, week or month
 *     description: Orders, on-time rate, money delivered/collected, expenses, credit notes, best sellers and low stock for the current branch. Returns JSON, or the PDF that is emailed to managers with `format=pdf`.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [day, week, month], default: day }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf], default: json }
 *     responses:
 *       200:
 *         description: Summary as JSON or application/pdf
 *       400:
 *         description: Unknown period
 */
router.get('/summary', auth, authorizeRoles(...ROLES.orderManagers), async (req, res, next) => {
  try {
    const period = summaryPeriod(req.query.period);
    if (!period) return res.status(400).json({ success: false, message: 'period must be day, week or month' });
    const summary = await buildSummary(period);
    if (req.query.format !== 'pdf') return res.json({ success: true, data: summary });
    const pdf = await summaryPdf(summary);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="waretrack-${period}-summary-${summary.from.toISOString().slice(0, 10)}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/summary/send:
 *   post:
 *     summary: Email the summary PDF to yourself now
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period: { type: string, enum: [day, week, month], default: day }
 *     responses:
 *       200:
 *         description: Email sent
 *       503:
 *         description: Email is not set up, or the provider refused it
 */
router.post('/summary/send', auth, authorizeRoles(...ROLES.orderManagers), async (req, res, next) => {
  try {
    const period = summaryPeriod(req.body?.period);
    if (!period) return res.status(400).json({ success: false, message: 'period must be day, week or month' });
    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) }, select: { email: true, name: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const summary = await buildSummary(period);
    const pdf = await summaryPdf(summary);
    const ok = await EmailService.sendEmail({
      email: user.email, name: user.name, title: `${PERIOD_NAMES[period]} summary · ${summary.branch}`, message: summaryText(summary),
      actionPath: '/reports', actionLabel: 'Open Reports',
      attachments: [{ filename: `waretrack-${period}-summary-${summary.from.toISOString().slice(0, 10)}.pdf`, content: pdf }],
    });
    if (!ok) return res.status(503).json({ success: false, message: EmailService.provider() === 'none' ? 'Email is not set up on the server' : 'The email could not be sent' });
    return res.json({ success: true, message: `Summary sent to ${user.email}` });
  } catch (error) {
    next(error);
  }
});

export default router;