import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/preferences', auth, NotificationController.getPreferences);
router.put('/preferences', auth, NotificationController.updatePreferences);
router.get('/system-config', auth, NotificationController.getSystemConfig);
router.put('/system-config', auth, NotificationController.updateSystemConfig);
router.get('/report-settings', auth, NotificationController.getReportSettings);
router.put('/report-settings', auth, NotificationController.updateReportSettings);
router.put('/:id/read', auth, NotificationController.markNotificationAsRead);
router.delete('/:id', auth, NotificationController.deleteNotification);

export default router;