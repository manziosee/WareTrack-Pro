import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { auth } from '../middleware/auth';

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
router.get('/analytics', auth, ReportsController.getAnalytics);

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
router.get('/sales', auth, ReportsController.getSalesReport);

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
router.get('/inventory', auth, ReportsController.getInventoryReport);

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
router.get('/vehicles', auth, ReportsController.getVehiclesReport);

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
router.get('/drivers', auth, ReportsController.getDriversReport);

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
router.post('/export', auth, ReportsController.exportReport);

export default router;