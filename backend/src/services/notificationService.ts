import { prisma } from '../lib/prisma';
import { EmailService } from './emailService';

export interface NotificationData {
  userId?: number;
  type: 'SYSTEM' | 'LOW_STOCK' | 'ORDER_UPDATE' | 'DELIVERY_COMPLETE' | 'WELCOME';
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  sendEmail?: boolean;
}

export class NotificationService {
  // Create and send notification
  static async createNotification(data: NotificationData) {
    try {
      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId || null,
          type: data.type,
          severity: data.severity,
          title: data.title,
          message: data.message
        }
      });

      // Send real-time notification via Socket.IO
      const io = (global as any).io;
      if (io) {
        if (data.userId) {
          // Send to specific user
          io.to(`user-${data.userId}`).emit('notification', notification);
        } else {
          // Send to all connected clients (system-wide notification)
          io.emit('notification', notification);
        }
      }

      // Send email if requested and user has email enabled
      if (data.sendEmail && data.userId) {
        await this.sendEmailNotification(data.userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Send email notification based on user preferences
  static async sendEmailNotification(userId: number, notification: any) {
    try {
      const [user, preferences] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.notificationPreferences.findUnique({ where: { userId } })
      ]);

      if (!user || !preferences?.emailEnabled) {
        return false;
      }

      // Check specific notification type preferences
      const shouldSend = this.shouldSendNotification(notification.type, preferences);
      if (!shouldSend) {
        return false;
      }

      return await EmailService.sendNotificationEmail(user.email, notification);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // Check if notification should be sent based on preferences
  static shouldSendNotification(type: string, preferences: any): boolean {
    switch (type) {
      case 'ORDER_UPDATE':
        return preferences.orderUpdates;
      case 'LOW_STOCK':
        return preferences.lowStockAlerts;
      case 'DELIVERY_COMPLETE':
        return preferences.orderUpdates;
      default:
        return true; // Send system alerts and other notifications by default
    }
  }

  // Create low stock alert
  static async createLowStockAlert(itemName: string, currentStock: number, minStock: number) {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    });

    const notifications = await Promise.all(
      admins.map(admin => 
        this.createNotification({
          userId: admin.id,
          type: 'LOW_STOCK',
          severity: 'WARNING',
          title: 'Low Stock Alert',
          message: `${itemName} is running low. Current stock: ${currentStock}, Minimum required: ${minStock}`,
          sendEmail: true
        })
      )
    );

    return notifications;
  }

  // Create order update notification
  static async createOrderUpdateNotification(orderId: number, status: string, userId?: number) {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      include: { createdByUser: true }
    });

    if (!order) return null;

    const targetUserId = userId || order.createdBy;
    
    return await this.createNotification({
      userId: targetUserId,
      type: 'ORDER_UPDATE',
      severity: 'INFO',
      title: 'Order Status Update',
      message: `Order #${order.orderNumber} status changed to ${status}`,
      sendEmail: true
    });
  }

  // Create delivery assignment notification
  static async createDeliveryAssignmentNotification(dispatchId: number, driverId: number) {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { 
        order: true,
        driver: { include: { user: true } }
      }
    });

    if (!dispatch || !dispatch.driver?.user) return null;

    return await this.createNotification({
      userId: dispatch.driver.user.id,
      type: 'DELIVERY_COMPLETE',
      severity: 'INFO',
      title: 'New Delivery Assignment',
      message: `You have been assigned to deliver order #${dispatch.order.orderNumber}`,
      sendEmail: true
    });
  }

  // Create system alert
  static async createSystemAlert(title: string, message: string, severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO') {
    // Send to all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    });

    const notifications = await Promise.all(
      admins.map(admin => 
        this.createNotification({
          userId: admin.id,
          type: 'SYSTEM',
          severity,
          title,
          message,
          sendEmail: severity === 'ERROR' || severity === 'WARNING'
        })
      )
    );

    return notifications;
  }

  // Create welcome notification for new users
  static async createWelcomeNotification(userId: number, userName: string) {
    return await this.createNotification({
      userId,
      type: 'WELCOME',
      severity: 'SUCCESS',
      title: 'Welcome to WareTrack-Pro!',
      message: `Welcome ${userName}! Your account has been created successfully. You can now access the warehouse management system.`,
      sendEmail: true
    });
  }

  // Get notification statistics for dashboard
  static async getNotificationStats(userId?: number) {
    const where = userId ? {
      OR: [
        { userId },
        { userId: null } // Global notifications
      ]
    } : {};

    const [total, unread, recent] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ 
        where: { ...where, read: false } 
      }),
      prisma.notification.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    return { total, unread, recent };
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        read: true
      }
    });

    console.log(`Cleaned up ${deleted.count} old notifications`);
    return deleted.count;
  }
}