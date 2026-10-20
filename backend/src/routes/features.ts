import express from 'express';
import { ProofOfDeliveryController } from '../controllers/proofOfDeliveryController';
import { ChatController } from '../controllers/chatController';
import { GamificationController } from '../controllers/gamificationController';
import { ForecastingController } from '../controllers/forecastingController';
import { SmartAlertsController } from '../controllers/smartAlertsController';
import { BarcodeController } from '../controllers/barcodeController';
import { CustomerPortalController, authenticateCustomer } from '../controllers/customerPortalController';
import { PredictiveMaintenanceController } from '../controllers/predictiveMaintenanceController';
import { UserPreferencesController } from '../controllers/userPreferencesController';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth';
import { publicTenant } from '../middleware/publicTenant';
import { prisma } from '../lib/prisma';
import { runWithoutTenant } from '../lib/tenantContext';

const router = express.Router();

// Proof of Delivery
router.post('/proof-of-delivery', authenticateToken, ProofOfDeliveryController.createProof);
router.get('/proof-of-delivery/:orderId', authenticateToken, ProofOfDeliveryController.getProof);
router.get('/proof-of-delivery/verify/:code', publicTenant, ProofOfDeliveryController.verifyCode);

// Chat
router.post('/chat/send', authenticateToken, ChatController.sendMessage);
router.get('/chat/messages', authenticateToken, ChatController.getMessages);
router.post('/chat/mark-read', authenticateToken, ChatController.markAsRead);

// Gamification
router.get('/gamification/leaderboard', authenticateToken, GamificationController.getLeaderboard);
router.get('/gamification/achievements/:driverId', authenticateToken, GamificationController.getAchievements);
router.post('/gamification/award', authenticateToken, authorizeRoles(...ROLES.fleetManagers), GamificationController.awardAchievement);
router.post('/gamification/update-leaderboard', authenticateToken, authorizeRoles(...ROLES.fleetManagers), GamificationController.updateLeaderboard);

// Forecasting
router.get('/forecasting/inventory', authenticateToken, ForecastingController.getInventoryForecast);
router.post('/forecasting/generate', authenticateToken, ForecastingController.generateForecast);
router.get('/forecasting/reorder-suggestions', authenticateToken, ForecastingController.getReorderSuggestions);

// Smart Alerts
router.get('/smart-alerts', authenticateToken, SmartAlertsController.getAlerts);
router.post('/smart-alerts/check-maintenance', authenticateToken, SmartAlertsController.checkMaintenanceAlerts);
router.post('/smart-alerts/check-license', authenticateToken, SmartAlertsController.checkLicenseExpiry);
router.post('/smart-alerts/check-deadlines', authenticateToken, SmartAlertsController.checkOrderDeadlines);
router.put('/smart-alerts/:alertId/resolve', authenticateToken, SmartAlertsController.resolveAlert);

// Barcode
router.post('/barcode/generate/:itemId', authenticateToken, authorizeRoles(...ROLES.inventoryManagers), BarcodeController.generateForItem);
router.post('/barcode/batch-generate', authenticateToken, authorizeRoles(...ROLES.inventoryManagers), BarcodeController.batchGenerate);
router.get('/barcode/lookup/:barcode', authenticateToken, BarcodeController.lookupByBarcode);

// Customer Portal
router.post('/customer/register', publicTenant, CustomerPortalController.register);
router.post('/customer/login', publicTenant, CustomerPortalController.login);
/** @openapi
 * /api/features/customer/me:
 *   get:
 *     summary: Read the signed-in customer's profile and delivery preferences
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Customer profile and saved delivery preferences }
 *       401: { description: Customer token required }
 *   patch:
 *     summary: Update contact and delivery preferences for the signed-in customer
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone: { type: string, maxLength: 40 }
 *               address: { type: string, maxLength: 500 }
 *               preferredDeliveryWindow: { type: string, maxLength: 100, example: "Weekdays, 9am–12pm" }
 *               deliveryInstructions: { type: string, maxLength: 2000 }
 *               contactPreference: { type: string, enum: [ANY, PHONE, EMAIL, SMS, WHATSAPP] }
 *     responses:
 *       200: { description: Updated profile }
 *       400: { description: Invalid preference value }
 *       401: { description: Customer token required }
 */
router.get('/customer/me', authenticateCustomer, CustomerPortalController.getProfile);
router.patch('/customer/me', authenticateCustomer, CustomerPortalController.updateProfile);
/** @openapi
 * /api/features/customer/me/account:
 *   get:
 *     summary: View balances and overdue amounts for customer accounts linked by email
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Customer account balances and aging }
 *       401: { description: Customer token required }
 */
router.get('/customer/me/account', authenticateCustomer, CustomerPortalController.getAccountSummary);
router.get('/customer/:customerId/orders', authenticateCustomer, CustomerPortalController.getOrders);
router.get('/customer/track/:orderNumber', publicTenant, CustomerPortalController.trackOrder);
/** @openapi
 * /api/features/customer/rate-driver:
 *   post:
 *     summary: Rate the assigned driver for one of your delivered orders
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, rating]
 *             properties:
 *               orderId: { type: integer }
 *               driverId: { type: integer, description: Optional consistency check; assignment is read from the order }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string, maxLength: 2000 }
 *     responses:
 *       200: { description: Feedback saved }
 *       404: { description: Delivered order does not belong to this customer }
 */
router.post('/customer/rate-driver', authenticateCustomer, CustomerPortalController.rateDriver);

/** @openapi
 * /api/features/customer/feedback:
 *   post:
 *     summary: Submit a complaint or service feedback report for one of your orders
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, category, message]
 *             properties:
 *               orderId: { type: integer }
 *               category: { type: string, enum: [DELIVERY, PRODUCT, SERVICE, OTHER] }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               message: { type: string, minLength: 5, maxLength: 4000 }
 *     responses:
 *       201: { description: Feedback was linked to the customer's order for supervisor review }
 *       404: { description: Order was not found for this customer }
 */
router.post('/customer/feedback', authenticateCustomer, async (req: any, res, next) => {
  try {
    const orderId = Number(req.body?.orderId);
    const category = String(req.body?.category || '');
    const message = String(req.body?.message || '').trim();
    const rating = req.body?.rating == null ? null : Number(req.body.rating);
    if (!Number.isInteger(orderId) || !['DELIVERY', 'PRODUCT', 'SERVICE', 'OTHER'].includes(category) || message.length < 5 || message.length > 4000 || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))) {
      return res.status(400).json({ success: false, error: { message: 'Provide a valid order, category, message, and optional rating from 1 to 5' } });
    }
    const result = await runWithoutTenant(async () => {
      const order = await prisma.deliveryOrder.findFirst({ where: { id: orderId, companyId: req.customer.companyId, customerId: req.customer.customerId } });
      if (!order) return null;
      return prisma.feedbackReport.create({ data: {
        companyId: order.companyId, branchId: order.branchId, orderId: order.id,
        customerId: req.customer.customerId, kind: 'CUSTOMER_FEEDBACK', category,
        message, rating, status: 'OPEN',
      } });
    });
    if (!result) return res.status(404).json({ success: false, error: { message: 'Order was not found for this customer' } });
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});
/** @openapi
 * /api/features/customer/reorder/{orderId}:
 *   post:
 *     summary: Reorder items from one of your previous orders
 *     tags: [Customer Portal]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: New order created with stock allocated atomically }
 *       404: { description: Previous order does not belong to this customer }
 *       409: { description: One or more items no longer have enough stock }
 */
router.post('/customer/reorder/:orderId', authenticateCustomer, CustomerPortalController.reorder);

// Predictive Maintenance
router.post('/maintenance/vehicle-health', authenticateToken, PredictiveMaintenanceController.recordVehicleHealth);
router.get('/maintenance/vehicle-health/:vehicleId', authenticateToken, PredictiveMaintenanceController.getVehicleHealth);
router.get('/maintenance/schedule', authenticateToken, PredictiveMaintenanceController.getMaintenanceSchedule);
router.get('/maintenance/cost-optimization', authenticateToken, PredictiveMaintenanceController.getCostOptimization);

// User Preferences
router.get('/preferences', authenticateToken, UserPreferencesController.getPreferences);
router.put('/preferences', authenticateToken, UserPreferencesController.updatePreferences);

export default router;
