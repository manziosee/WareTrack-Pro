/**
 * @swagger
 * /api/dispatch:
 *   get:
 *     summary: Get all dispatches
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Dispatches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           orderId:
 *                             type: integer
 *                           driverId:
 *                             type: integer
 *                           vehicleId:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           scheduledAt:
 *                             type: string
 *                             format: date-time
 */

/**
 * @swagger
 * /api/dispatch/active:
 *   get:
 *     summary: Get active dispatches
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active dispatches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   orderId:
 *                     type: integer
 *                   orderNumber:
 *                     type: string
 *                   driverName:
 *                     type: string
 *                   vehiclePlate:
 *                     type: string
 *                   status:
 *                     type: string
 *                   currentLocation:
 *                     type: string
 *                   estimatedArrival:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /api/dispatch/driver/{id}:
 *   get:
 *     summary: Get driver's current dispatch
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Driver dispatch retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 orderId:
 *                   type: integer
 *                 orderNumber:
 *                   type: string
 *                 customerName:
 *                   type: string
 *                 deliveryAddress:
 *                   type: string
 *                 contactNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       unit:
 *                         type: string
 */

/**
 * @swagger
 * /api/dispatch:
 *   post:
 *     summary: Create new dispatch
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, driverId, vehicleId]
 *             properties:
 *               orderId:
 *                 type: integer
 *               driverId:
 *                 type: integer
 *               vehicleId:
 *                 type: integer
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dispatch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 orderId:
 *                   type: integer
 *                 driverId:
 *                   type: integer
 *                 vehicleId:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 scheduledAt:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /api/dispatch/{id}/status:
 *   post:
 *     summary: Update dispatch status
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, in_transit, completed, cancelled]
 *               location:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispatch status updated successfully
 */

/**
 * @swagger
 * /api/dispatch/{id}:
 *   put:
 *     summary: Update dispatch
 *     tags: [Dispatch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               estimatedArrival:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispatch updated successfully
 */