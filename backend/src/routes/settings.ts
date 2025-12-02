import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { auth } from '../middleware/auth';

const router = Router();

// Profile Settings
router.get('/profile', auth, SettingsController.getProfile);
router.put('/profile', auth, SettingsController.updateProfile);
router.post('/profile/password', auth, SettingsController.changePassword);

// System Settings
router.get('/system', auth, SettingsController.getSystemSettings);
router.put('/system', auth, SettingsController.updateSystemSettings);

// Notification Settings
router.get('/notifications', auth, SettingsController.getNotificationSettings);
router.put('/notifications', auth, SettingsController.updateNotificationSettings);

// Security Settings
router.get('/security', auth, SettingsController.getSecuritySettings);
router.put('/security', auth, SettingsController.updateSecuritySettings);

export default router;