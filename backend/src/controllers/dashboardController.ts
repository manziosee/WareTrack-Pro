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

      const summary = {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        activeVehicles,
        inMaintenance,
        lowStockItems: Number(lowStockCount),
        totalInventoryItems,
        totalDrivers
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
      // Mock recent activities
      const activities = [
        { id: 1, type: 'order_created', message: 'New order ORD-000001 created', timestamp: new Date(), user: 'Admin' },
        { id: 2, type: 'inventory_updated', message: 'Laptop Dell XPS 15 stock updated', timestamp: new Date(), user: 'Warehouse Staff' },
        { id: 3, type: 'order_delivered', message: 'Order ORD-000002 delivered successfully', timestamp: new Date(), user: 'Driver' }
      ];
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
        message: `Low stock alert: ${item.name} (${item.quantity} remaining)`,
        severity: 'warning',
        timestamp: new Date()
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
}