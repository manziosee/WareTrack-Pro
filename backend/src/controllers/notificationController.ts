import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class NotificationController {
  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      let preferences = await prisma.notificationPreferences.findUnique({
        where: { userId }
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await prisma.notificationPreferences.create({
          data: {
            userId,
            emailEnabled: true,
            smsEnabled: false,
            orderUpdates: true,
            lowStockAlerts: true
          }
        });
      }

      res.json({ success: true, data: preferences });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { emailEnabled, smsEnabled, orderUpdates, lowStockAlerts } = req.body;

      const preferences = await prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          emailEnabled,
          smsEnabled,
          orderUpdates,
          lowStockAlerts
        },
        create: {
          userId,
          emailEnabled,
          smsEnabled,
          orderUpdates,
          lowStockAlerts
        }
      });

      res.json({ success: true, data: preferences });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getSystemConfig(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      let config = await prisma.systemConfiguration.findUnique({
        where: { userId }
      });

      if (!config) {
        config = await prisma.systemConfiguration.create({
          data: {
            userId,
            language: 'en',
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            currency: 'RWF'
          }
        });
      }

      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateSystemConfig(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { language, timezone, dateFormat, currency } = req.body;

      const config = await prisma.systemConfiguration.upsert({
        where: { userId },
        update: { language, timezone, dateFormat, currency },
        create: { userId, language, timezone, dateFormat, currency }
      });

      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getReportSettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      let settings = await prisma.reportSettings.findUnique({
        where: { userId }
      });

      if (!settings) {
        settings = await prisma.reportSettings.create({
          data: {
            userId,
            autoReportsEnabled: false,
            reportFrequency: 'weekly',
            reportFormat: 'pdf',
            emailReports: true
          }
        });
      }

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateReportSettings(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { autoReportsEnabled, reportFrequency, reportFormat, emailReports } = req.body;

      const settings = await prisma.reportSettings.upsert({
        where: { userId },
        update: { autoReportsEnabled, reportFrequency, reportFormat, emailReports },
        create: { userId, autoReportsEnabled, reportFrequency, reportFormat, emailReports }
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async markNotificationAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const notification = await prisma.notification.update({
        where: { id: Number(id) },
        data: { read: true }
      });

      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.notification.delete({
        where: { id: Number(id) }
      });

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}