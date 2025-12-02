import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';

const cache = CacheService.getInstance();

export class DashboardController {
  static async getSummary(req: Request, res: Response) {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Last week dates
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(today);
      
      const previousWeekStart = new Date(lastWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = new Date(lastWeekStart);

      // Current week data
      const [
        totalInventoryItems,
        totalInventoryValue,
        deliveriesToday,
        pendingDispatches,
        inTransit,
        lowStockItems
      ] = await Promise.all([
        prisma.inventoryItem.count(),
        prisma.inventoryItem.findMany({ select: { quantity: true, unitPrice: true } }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: today, lt: tomorrow }
          }
        }),
        prisma.deliveryOrder.count({ where: { status: 'PENDING' } }),
        prisma.deliveryOrder.count({ where: { status: 'IN_TRANSIT' } }),
        prisma.$queryRaw`SELECT COUNT(*)::int as count FROM inventory_items WHERE quantity < min_quantity`
      ]);

      // Previous week data for comparison
      const [
        prevInventoryItems,
        prevDeliveries,
        prevPendingDispatches,
        prevInTransit,
        prevLowStockItems
      ] = await Promise.all([
        prisma.inventoryItem.count({
          where: {
            createdAt: { lt: lastWeekEnd }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: previousWeekStart, lt: previousWeekEnd }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'PENDING',
            createdAt: { gte: previousWeekStart, lt: previousWeekEnd }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'IN_TRANSIT',
            createdAt: { gte: previousWeekStart, lt: previousWeekEnd }
          }
        }),
        prisma.$queryRaw`SELECT COUNT(*)::int as count FROM inventory_items WHERE quantity < min_quantity AND created_at < ${lastWeekEnd}`
      ]);

      // Calculate percentages
      const calculatePercentage = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const inventoryValue = Array.isArray(totalInventoryValue) 
        ? totalInventoryValue.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
        : 0;

      const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems[0]?.count || 0 : 0;
      const prevLowStockCount = Array.isArray(prevLowStockItems) ? prevLowStockItems[0]?.count || 0 : 0;

      const summary = {
        totalInventory: {
          value: totalInventoryItems,
          percentage: calculatePercentage(totalInventoryItems, prevInventoryItems),
          currency: 'RWF'
        },
        deliveriesToday: {
          value: deliveriesToday,
          percentage: calculatePercentage(deliveriesToday, prevDeliveries)
        },
        pendingDispatches: {
          value: pendingDispatches,
          percentage: calculatePercentage(pendingDispatches, prevPendingDispatches)
        },
        inTransit: {
          value: inTransit,
          percentage: calculatePercentage(inTransit, prevInTransit)
        },
        lowStockAlerts: {
          value: lowStockCount,
          percentage: calculatePercentage(lowStockCount, prevLowStockCount)
        },
        totalInventoryValue: inventoryValue,
        currency: 'RWF'
      };

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Dashboard summary error:', error);
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
      const { period = '7' } = req.query;
      const days = parseInt(period as string) || 7;
      
      const trends = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const [completed, pending, cancelled] = await Promise.all([
          prisma.deliveryOrder.count({
            where: {
              status: 'DELIVERED',
              deliveredAt: { gte: date, lt: nextDay }
            }
          }),
          prisma.deliveryOrder.count({
            where: {
              status: 'PENDING',
              createdAt: { gte: date, lt: nextDay }
            }
          }),
          prisma.deliveryOrder.count({
            where: {
              status: 'CANCELLED',
              updatedAt: { gte: date, lt: nextDay }
            }
          })
        ]);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          completed,
          pending,
          cancelled
        });
      }

      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Trends error:', error);
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

  static async getInventoryByCategory(req: Request, res: Response) {
    try {
      const inventoryByCategory = await prisma.inventoryItem.groupBy({
        by: ['category'],
        _count: { id: true },
        _sum: { quantity: true }
      });

      const categoryData = inventoryByCategory.map(item => ({
        category: item.category || 'Uncategorized',
        count: item._count.id,
        totalQuantity: item._sum.quantity || 0
      }));

      res.json({ success: true, data: categoryData });
    } catch (error) {
      console.error('Inventory by category error:', error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getRecentOrders(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;
      
      const recentOrders = await prisma.deliveryOrder.findMany({
        take: parseInt(limit as string) || 10,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } },
          createdByUser: { select: { name: true } }
        }
      });

      const formattedOrders = recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        totalAmount: `RWF ${Number(order.totalAmount).toLocaleString()}`,
        createdAt: order.createdAt,
        driver: order.driver?.name || 'Not assigned',
        vehicle: order.vehicle?.plateNumber || 'Not assigned',
        createdBy: order.createdByUser?.name || 'System'
      }));

      res.json({ success: true, data: formattedOrders });
    } catch (error) {
      console.error('Recent orders error:', error);
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