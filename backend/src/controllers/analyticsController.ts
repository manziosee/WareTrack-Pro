import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AnalyticsController {
  // Inventory Analytics
  static async getInventoryTrends(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const history = await prisma.inventoryHistory.findMany({
        where: { performedAt: { gte: startDate } },
        include: { item: true },
        orderBy: { performedAt: 'asc' }
      });

      const trends = history.reduce((acc: any, record) => {
        const date = record.performedAt.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, stockIn: 0, stockOut: 0, value: 0 };
        
        if (record.action === 'stock_in') {
          acc[date].stockIn += record.quantity;
          acc[date].value += record.quantity * Number(record.item.unitPrice);
        } else {
          acc[date].stockOut += record.quantity;
          acc[date].value -= record.quantity * Number(record.item.unitPrice);
        }
        return acc;
      }, {});

      res.json({ success: true, data: Object.values(trends) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch inventory trends' });
    }
  }

  static async getCategoryDistribution(req: Request, res: Response) {
    try {
      const items = await prisma.inventoryItem.findMany();
      
      const distribution = items.reduce((acc: any, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { category: item.category, count: 0, value: 0 };
        }
        acc[item.category].count += 1;
        acc[item.category].value += item.quantity * Number(item.unitPrice);
        return acc;
      }, {});

      res.json({ success: true, data: Object.values(distribution) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch category distribution' });
    }
  }

  // Driver Analytics
  static async getDriverPerformance(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      
      const driver = await prisma.driver.findUnique({
        where: { id: Number(driverId) },
        include: {
          orders: {
            include: { items: true }
          }
        }
      });

      if (!driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      const completedOrders = driver.orders.filter(o => o.status === 'DELIVERED');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      
      // Performance by month
      const monthlyPerformance = completedOrders.reduce((acc: any, order) => {
        const month = order.deliveredAt?.toISOString().slice(0, 7) || 'Unknown';
        if (!acc[month]) acc[month] = { month, deliveries: 0, revenue: 0 };
        acc[month].deliveries += 1;
        acc[month].revenue += Number(order.totalAmount);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            name: driver.name,
            rating: Number(driver.rating || 0),
            experience: driver.experience
          },
          stats: {
            totalDeliveries: completedOrders.length,
            totalRevenue,
            averageOrderValue: totalRevenue / completedOrders.length || 0,
            successRate: (completedOrders.length / driver.orders.length) * 100 || 0
          },
          monthlyPerformance: Object.values(monthlyPerformance)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch driver performance' });
    }
  }

  // Fleet Analytics
  static async getFleetUtilization(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        include: {
          orders: {
            where: { status: { in: ['DISPATCHED', 'IN_TRANSIT'] } }
          }
        }
      });

      const utilization = vehicles.map(vehicle => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        status: vehicle.status,
        activeOrders: vehicle.orders.length,
        utilizationRate: vehicle.status === 'IN_USE' ? 100 : vehicle.status === 'AVAILABLE' ? 0 : 50
      }));

      const summary = {
        totalVehicles: vehicles.length,
        inUse: vehicles.filter(v => v.status === 'IN_USE').length,
        available: vehicles.filter(v => v.status === 'AVAILABLE').length,
        maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
        averageUtilization: utilization.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicles.length || 0
      };

      res.json({ success: true, data: { summary, vehicles: utilization } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch fleet utilization' });
    }
  }

  // Dispatch Analytics
  static async getDispatchEfficiency(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const orders = await prisma.deliveryOrder.findMany({
        where: { createdAt: { gte: startDate } },
        include: { driver: true, vehicle: true }
      });

      // Daily dispatch metrics
      const dailyMetrics = orders.reduce((acc: any, order) => {
        const date = order.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, total: 0, dispatched: 0, delivered: 0, avgTime: 0 };
        }
        acc[date].total += 1;
        if (order.status === 'DISPATCHED' || order.status === 'IN_TRANSIT') acc[date].dispatched += 1;
        if (order.status === 'DELIVERED') acc[date].delivered += 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          dailyMetrics: Object.values(dailyMetrics),
          summary: {
            totalOrders: orders.length,
            dispatchRate: (orders.filter(o => o.status !== 'PENDING').length / orders.length) * 100 || 0,
            deliveryRate: (orders.filter(o => o.status === 'DELIVERED').length / orders.length) * 100 || 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch dispatch efficiency' });
    }
  }

  // Order Analytics
  static async getOrderTrends(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const orders = await prisma.deliveryOrder.findMany({
        where: { createdAt: { gte: startDate } }
      });

      const trends = orders.reduce((acc: any, order) => {
        const date = order.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, orders: 0, revenue: 0, avgValue: 0 };
        }
        acc[date].orders += 1;
        acc[date].revenue += Number(order.totalAmount);
        return acc;
      }, {});

      // Calculate average
      Object.values(trends).forEach((day: any) => {
        day.avgValue = day.revenue / day.orders;
      });

      res.json({ success: true, data: Object.values(trends) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch order trends' });
    }
  }
}
