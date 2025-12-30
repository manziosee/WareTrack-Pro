import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/emailService';

export class NotificationController {
  // Get user notifications with pagination
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const where = {
        OR: [
          { userId },
          { userId: null } // Global notifications
        ],
        ...(unreadOnly && { read: false })
      };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.notification.count({ where })
      ]);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Create notification
  static async createNotification(req: Request, res: Response) {
    try {
      const { userId, type, severity, title, message, metadata } = req.body;
      
      const notification = await prisma.notification.create({
        data: {
          userId: userId || null,
          type,
          severity: severity || 'INFO',
          title,
          message
        }
      });

      // Send email if user has email notifications enabled
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const preferences = await prisma.notificationPreferences.findUnique({ where: { userId } });
        
        if (user && preferences?.emailEnabled) {
          await EmailService.sendNotificationEmail(user.email, notification);
        }
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId },
            { userId: null }
          ],
          read: false
        },
        data: { read: true }
      });

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Get notification statistics
  static async getNotificationStats(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      const [total, unread, byType] = await Promise.all([
        prisma.notification.count({
          where: {
            OR: [
              { userId },
              { userId: null }
            ]
          }
        }),
        prisma.notification.count({
          where: {
            OR: [
              { userId },
              { userId: null }
            ],
            read: false
          }
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: {
            OR: [
              { userId },
              { userId: null }
            ]
          },
          _count: true
        })
      ]);

      res.json({
        success: true,
        data: {
          total,
          unread,
          byType: byType.reduce((acc, item) => {
            acc[item.type] = item._count;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
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