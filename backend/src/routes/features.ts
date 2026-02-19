import express from 'express';
import { ProofOfDeliveryController } from '../controllers/proofOfDeliveryController';
import { ChatController } from '../controllers/chatController';
import { GamificationController } from '../controllers/gamificationController';
import { ForecastingController } from '../controllers/forecastingController';
import { SmartAlertsController } from '../controllers/smartAlertsController';
import { BarcodeController } from '../controllers/barcodeController';
import { CustomerPortalController } from '../controllers/customerPortalController';
import { PredictiveMaintenanceController } from '../controllers/predictiveMaintenanceController';
import { UserPreferencesController } from '../controllers/userPreferencesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Proof of Delivery
router.post('/proof-of-delivery', authenticateToken, ProofOfDeliveryController.createProof);
router.get('/proof-of-delivery/:orderId', authenticateToken, ProofOfDeliveryController.getProof);
router.get('/proof-of-delivery/verify/:code', ProofOfDeliveryController.verifyCode);

// Chat
router.post('/chat/send', authenticateToken, ChatController.sendMessage);
router.get('/chat/messages', authenticateToken, ChatController.getMessages);
router.post('/chat/mark-read', authenticateToken, ChatController.markAsRead);

// Gamification
router.get('/gamification/leaderboard', authenticateToken, GamificationController.getLeaderboard);
router.get('/gamification/achievements/:driverId', authenticateToken, GamificationController.getAchievements);
router.post('/gamification/award', authenticateToken, GamificationController.awardAchievement);
router.post('/gamification/update-leaderboard', authenticateToken, GamificationController.updateLeaderboard);

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
router.post('/barcode/generate/:itemId', authenticateToken, BarcodeController.generateForItem);
router.post('/barcode/batch-generate', authenticateToken, BarcodeController.batchGenerate);
router.get('/barcode/lookup/:barcode', authenticateToken, BarcodeController.lookupByBarcode);

// Customer Portal
router.post('/customer/register', CustomerPortalController.register);
router.post('/customer/login', CustomerPortalController.login);
router.get('/customer/:customerId/orders', CustomerPortalController.getOrders);
router.get('/customer/track/:orderNumber', CustomerPortalController.trackOrder);
router.post('/customer/rate-driver', CustomerPortalController.rateDriver);
router.post('/customer/reorder/:orderId', CustomerPortalController.reorder);

// Predictive Maintenance
router.post('/maintenance/vehicle-health', authenticateToken, PredictiveMaintenanceController.recordVehicleHealth);
router.get('/maintenance/vehicle-health/:vehicleId', authenticateToken, PredictiveMaintenanceController.getVehicleHealth);
router.get('/maintenance/schedule', authenticateToken, PredictiveMaintenanceController.getMaintenanceSchedule);
router.get('/maintenance/cost-optimization', authenticateToken, PredictiveMaintenanceController.getCostOptimization);

// User Preferences
router.get('/preferences', authenticateToken, UserPreferencesController.getPreferences);
router.put('/preferences', authenticateToken, UserPreferencesController.updatePreferences);

export default router;
