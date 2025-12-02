import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

export class SettingsController {
  // Profile Settings
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { name, phone, email } = req.body;

      const nameParts = name?.trim().split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          firstName,
          lastName,
          phone,
          email
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true
        }
      });

      res.json({ success: true, data: user });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already exists' }
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // System Settings
  static async getSystemSettings(req: Request, res: Response) {
    try {
      const settings = {
        companyName: 'WareTrack-Pro',
        currency: 'RWF',
        timezone: 'Africa/Kigali',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        lowStockThreshold: 10,
        autoBackup: true,
        emailNotifications: true,
        smsNotifications: false
      };

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateSystemSettings(req: Request, res: Response) {
    try {
      const settings = req.body;
      
      // In a real app, save to database
      // For now, just return the updated settings
      res.json({
        success: true,
        data: settings,
        message: 'System settings updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Notification Settings
  static async getNotificationSettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      // Mock notification preferences
      const settings = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        lowStockAlerts: true,
        orderUpdates: true,
        deliveryNotifications: true,
        systemAlerts: true
      };

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const settings = req.body;

      // In a real app, save to user preferences table
      res.json({
        success: true,
        data: settings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Security Settings
  static async getSecuritySettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      const settings = {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        passwordExpiry: 90,
        loginAttempts: 5,
        ipWhitelist: [],
        lastPasswordChange: new Date()
      };

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateSecuritySettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const settings = req.body;

      res.json({
        success: true,
        data: settings,
        message: 'Security settings updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}