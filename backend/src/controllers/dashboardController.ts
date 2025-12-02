import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';

const cache = CacheService.getInstance();

export class DashboardController {
  static async getSummary(req: Request, res: Response) {
    try {
      const { period = 'month' } = req.query;
      
      // Check cache first
      const cached = await cache.getCachedDashboardStats();
      if (cached) {
        return res.json({ success: true, data: cached });
      }

      const [
        totalOrders,
        completedOrders,
        pendingOrders,
        activeVehicles,
        inMaintenance,
        lowStockItems,
        totalInventoryItems,
        totalDrivers
      ] = await Promise.all([
        prisma.deliveryOrder.count(),
        prisma.deliveryOrder.count({ where: { status: 'DELIVERED' } }),
        prisma.deliveryOrder.count({ where: { status: 'PENDING' } }),
        prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
        prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
        prisma.$queryRaw`SELECT COUNT(*)::int as count FROM inventory_items WHERE quantity < min_quantity`,
        prisma.inventoryItem.count(),
        prisma.driver.count()
      ]);

      // Calculate total revenue from completed orders
      const revenueResult = await prisma.deliveryOrder.findMany({
        where: { status: 'DELIVERED' },
        select: { totalAmount: true }
      });
      const totalRevenue = revenueResult.reduce((sum, order) => sum + Number(order.totalAmount), 0);

      const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems[0]?.count || 0 : 0;

      // Get today's deliveries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const deliveriesToday = await prisma.deliveryOrder.count({
        where: {
          status: 'DELIVERED',
          deliveredAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // Get total inventory value
      const inventoryItems = await prisma.inventoryItem.findMany({
        select: { quantity: true, unitPrice: true }
      });
      const totalInventoryValue = inventoryItems.reduce((sum, item) => 
        sum + (item.quantity * Number(item.unitPrice)), 0
      );

      const summary = {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        deliveriesToday,
        activeVehicles,
        inMaintenance,
        lowStockItems: Number(lowStockCount),
        totalInventoryItems,
        totalInventoryValue,
        totalDrivers,
        currency: 'RWF'
      };

      await cache.cacheDashboardStats(summary);
      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getActivity(req: Request, res: Response) {
    try {
      // Get real recent activities from database
      const [recentOrders, recentInventoryUpdates, deliveredOrders] = await Promise.all([
        prisma.deliveryOrder.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { createdByUser: true }
        }),
        prisma.inventoryHistory.findMany({
          take: 3,
          orderBy: { performedAt: 'desc' },
          include: { 
            item: true,
            performedByUser: true
          }
        }),
        prisma.deliveryOrder.findMany({
          where: { status: 'DELIVERED' },
          take: 3,
          orderBy: { deliveredAt: 'desc' },
          include: { driver: { include: { user: true } } }
        })
      ]);

      const activities = [];

      // Add order activities
      recentOrders.forEach(order => {
        activities.push({
          id: `order_${order.id}`,
          type: 'order_created',
          message: `New order ${order.orderNumber} from ${order.customerName}`,
          timestamp: order.createdAt,
          user: order.createdByUser?.name || 'System'
        });
      });

      // Add inventory activities
      recentInventoryUpdates.forEach(update => {
        activities.push({
          id: `inventory_${update.id}`,
          type: 'inventory_updated',
          message: `${update.item.name} stock ${update.action} (${update.quantity} units)`,
          timestamp: update.performedAt,
          user: update.performedByUser?.name || 'System'
        });
      });

      // Add delivery activities
      deliveredOrders.forEach(order => {
        activities.push({
          id: `delivery_${order.id}`,
          type: 'order_delivered',
          message: `Order ${order.orderNumber} delivered successfully`,
          timestamp: order.deliveredAt || order.updatedAt,
          user: order.driver?.name || 'Driver'
        });
      });

      // Sort by timestamp and take latest 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      res.json({ success: true, data: sortedActivities });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getUpcoming(req: Request, res: Response) {
    try {
      const upcomingOrders = await prisma.deliveryOrder.findMany({
        where: { status: 'PENDING' },
        take: 5,
        include: {
          driver: true,
          vehicle: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({ success: true, data: upcomingOrders });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getTrends(req: Request, res: Response) {
    try {
      const { period = 'month' } = req.query;
      
      // Mock trend data - in production, calculate from actual data
      const trends = [
        { date: '2023-01-01', completed: 5, pending: 2, cancelled: 0 },
        { date: '2023-01-02', completed: 8, pending: 3, cancelled: 1 },
        { date: '2023-01-03', completed: 6, pending: 4, cancelled: 0 },
        { date: '2023-01-04', completed: 10, pending: 2, cancelled: 1 },
        { date: '2023-01-05', completed: 7, pending: 5, cancelled: 0 }
      ];

      res.json({ success: true, data: trends });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getAlerts(req: Request, res: Response) {
    try {
      const lowStockItems = await prisma.$queryRaw`
        SELECT * FROM inventory_items WHERE quantity < min_quantity
      `;

      const alerts = (lowStockItems as any[]).map((item: any) => ({
        id: item.id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity} units left)`,
        severity: 'warning',
        timestamp: new Date(),
        timeAgo: getTimeAgo(item.last_updated || new Date())
      }));

      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getNotifications(req: Request, res: Response) {
    try {
      const [lowStockItems, recentOrders, deliveredOrders] = await Promise.all([
        prisma.$queryRaw`SELECT * FROM inventory_items WHERE quantity < min_quantity ORDER BY last_updated DESC LIMIT 5`,
        prisma.deliveryOrder.findMany({
          where: { 
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.deliveryOrder.findMany({
          where: { 
            status: 'DELIVERED',
            deliveredAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: { deliveredAt: 'desc' },
          take: 5
        })
      ]);

      const notifications = [];

      // Low stock notifications
      (lowStockItems as any[]).forEach(item => {
        notifications.push({
          id: `low_stock_${item.id}`,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${item.name} is running low (${item.quantity} units left)`,
          timestamp: item.last_updated || new Date(),
          timeAgo: getTimeAgo(item.last_updated || new Date()),
          severity: 'warning'
        });
      });

      // New order notifications
      recentOrders.forEach(order => {
        notifications.push({
          id: `new_order_${order.id}`,
          type: 'new_order',
          title: 'New Order',
          message: `New order ${order.orderNumber} from ${order.customerName}`,
          timestamp: order.createdAt,
          timeAgo: getTimeAgo(order.createdAt),
          severity: 'info'
        });
      });

      // Delivery notifications
      deliveredOrders.forEach(order => {
        notifications.push({
          id: `delivered_${order.id}`,
          type: 'order_delivered',
          title: 'Order Delivered',
          message: `Order ${order.orderNumber} has been delivered successfully`,
          timestamp: order.deliveredAt || order.updatedAt,
          timeAgo: getTimeAgo(order.deliveredAt || order.updatedAt),
          severity: 'success'
        });
      });

      // Sort by timestamp and take latest 10
      const sortedNotifications = notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      res.json({ success: true, data: sortedNotifications });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}
}