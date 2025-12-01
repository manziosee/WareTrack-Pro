import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, count, lt } from 'drizzle-orm';
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
        lowStockItems
      ] = await Promise.all([
        db.select({ count: count() }).from(schema.deliveryOrders),
        db.select({ count: count() }).from(schema.deliveryOrders).where(eq(schema.deliveryOrders.status, 'delivered')),
        db.select({ count: count() }).from(schema.deliveryOrders).where(eq(schema.deliveryOrders.status, 'pending')),
        db.select({ count: count() }).from(schema.vehicles).where(eq(schema.vehicles.status, 'available')),
        db.select({ count: count() }).from(schema.vehicles).where(eq(schema.vehicles.status, 'maintenance')),
        db.select({ count: count() }).from(schema.inventoryItems).where(lt(schema.inventoryItems.quantity, schema.inventoryItems.minQuantity))
      ]);

      // Calculate total revenue from completed orders
      const revenueResult = await db.select().from(schema.deliveryOrders).where(eq(schema.deliveryOrders.status, 'delivered'));
      const totalRevenue = revenueResult.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

      const summary = {
        totalOrders: totalOrders[0].count,
        completedOrders: completedOrders[0].count,
        pendingOrders: pendingOrders[0].count,
        totalRevenue,
        activeVehicles: activeVehicles[0].count,
        inMaintenance: inMaintenance[0].count,
        lowStockItems: lowStockItems[0].count
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
      const upcomingOrders = await db.select()
        .from(schema.deliveryOrders)
        .where(eq(schema.deliveryOrders.status, 'pending'))
        .limit(5);
      
      res.json(upcomingOrders);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
      const lowStockItems = await db.select()
        .from(schema.inventoryItems)
        .where(lt(schema.inventoryItems.quantity, schema.inventoryItems.minQuantity));

      const alerts = lowStockItems.map(item => ({
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