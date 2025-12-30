import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// Notification CRUD
router.get('/', auth, NotificationController.getNotifications);
router.post('/', auth, adminAuth, NotificationController.createNotification);
router.put('/:id/read', auth, NotificationController.markNotificationAsRead);
router.put('/mark-all-read', auth, NotificationController.markAllAsRead);
router.delete('/:id', auth, NotificationController.deleteNotification);
router.get('/stats', auth, NotificationController.getNotificationStats);

// Settings
router.get('/preferences', auth, NotificationController.getPreferences);
router.put('/preferences', auth, NotificationController.updatePreferences);
router.get('/system-config', auth, NotificationController.getSystemConfig);
router.put('/system-config', auth, NotificationController.updateSystemConfig);
router.get('/report-settings', auth, NotificationController.getReportSettings);
router.put('/report-settings', auth, NotificationController.updateReportSettings);

export default router;