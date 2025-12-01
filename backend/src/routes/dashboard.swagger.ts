/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalInventory:
 *                   type: integer
 *                   example: 155
 *                 deliveriesToday:
 *                   type: integer
 *                   example: 8
 *                 pendingDispatches:
 *                   type: integer
 *                   example: 5
 *                 inTransit:
 *                   type: integer
 *                   example: 3
 *                 lowStockItems:
 *                   type: integer
 *                   example: 3
 *                 totalOrders:
 *                   type: integer
 *                   example: 125
 *                 totalUsers:
 *                   type: integer
 *                   example: 15
 *                 totalVehicles:
 *                   type: integer
 *                   example: 8
 *                 availableVehicles:
 *                   type: integer
 *                   example: 5
 */

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get delivery trends data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days for trend data
 *     responses:
 *       200:
 *         description: Delivery trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: 2024-11-30
 *                   delivered:
 *                     type: integer
 *                     example: 8
 *                   pending:
 *                     type: integer
 *                     example: 5
 *                   inTransit:
 *                     type: integer
 *                     example: 3
 */

/**
 * @swagger
 * /api/reports/inventory:
 *   get:
 *     summary: Generate inventory report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel, json]
 *           default: json
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Inventory report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportId:
 *                   type: string
 *                   example: RPT-INV-001
 *                 status:
 *                   type: string
 *                   example: completed
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/reports/download/RPT-INV-001
 */

/**
 * @swagger
 * /api/reports/orders:
 *   get:
 *     summary: Generate orders report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel, json]
 *           default: json
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, dispatched, in_transit, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Orders report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportId:
 *                   type: string
 *                   example: RPT-ORD-001
 *                 status:
 *                   type: string
 *                   example: completed
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/reports/download/RPT-ORD-001
 */

/**
 * @swagger
 * /api/reports/performance:
 *   get:
 *     summary: Generate performance report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel, json]
 *           default: json
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportId:
 *                   type: string
 *                   example: RPT-PERF-001
 *                 status:
 *                   type: string
 *                   example: completed
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/reports/download/RPT-PERF-001
 */