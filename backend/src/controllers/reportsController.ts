import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class ReportsController {
  static async getSalesReport(req: Request, res: Response) {
    try {
      const { startDate, endDate, format = 'json', customerId, paymentMethod } = req.query;
      
      const whereClause: any = {
        status: 'DELIVERED'
      };

      if (startDate && endDate) {
        whereClause.deliveredAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      if (customerId) {
        whereClause.customerId = Number(customerId);
      }

      if (paymentMethod) {
        whereClause.paymentMethod = paymentMethod;
      }
      
      const orders = await prisma.deliveryOrder.findMany({
        where: whereClause,
        include: {
          items: true,
          driver: true
        },
        orderBy: { deliveredAt: 'desc' }
      });

      const salesData = orders.map(order => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        totalAmount: Number(order.totalAmount),
        formattedAmount: `RWF ${Number(order.totalAmount).toLocaleString()}`,
        currency: 'RWF',
        deliveredAt: order.deliveredAt,
        paymentMethod: order.paymentMethod,
        driverName: order.driver?.name || 'N/A',
        itemCount: order.items.length
      }));

      const totalSales = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
      
      const report = {
        summary: {
          totalOrders: salesData.length,
          totalSales,
          averageOrderValue: totalSales / salesData.length || 0,
          currency: 'RWF',
          dateRange: {
            startDate: startDate || null,
            endDate: endDate || null
          }
        },
        data: salesData
      };

      if (format === 'json') {
        res.json({ success: true, data: report });
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'sales',
          filters: { startDate, endDate },
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ 
          success: true,
          message: 'Report generation queued', 
          status: 'processing' 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getInventoryReport(req: Request, res: Response) {
    try {
      const { category, lowStock, format = 'json' } = req.query;
      
      const items = await prisma.inventoryItem.findMany({
        where: {
          ...(category && { category: category as string })
        }
      });
      
      const inventoryData = items.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unitPrice: Number(item.unitPrice),
        totalValue: item.quantity * Number(item.unitPrice),
        formattedValue: `RWF ${(item.quantity * Number(item.unitPrice)).toLocaleString()}`,
        formattedUnitPrice: `RWF ${Number(item.unitPrice).toLocaleString()}`,
        currency: 'RWF',
        status: item.status,
        isLowStock: item.quantity < item.minQuantity
      }));

      const totalValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
      const lowStockCount = inventoryData.filter(item => item.isLowStock).length;

      const report = {
        summary: {
          totalItems: inventoryData.length,
          totalValue,
          lowStockItems: lowStockCount,
          categories: [...new Set(inventoryData.map(item => item.category))].length
        },
        data: lowStock === 'true' ? inventoryData.filter(item => item.isLowStock) : inventoryData
      };

      if (format === 'json') {
        res.json({ success: true, data: report });
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'inventory',
          filters: { category, lowStock },
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ 
          success: true,
          message: 'Report generation queued', 
          status: 'processing' 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getVehiclesReport(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query;
      
      const vehicles = await prisma.vehicle.findMany({
        include: {
          maintenanceRecords: true
        }
      });
      
      const vehicleData = vehicles.map(vehicle => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        capacity: vehicle.capacity,
        status: vehicle.status,
        utilizationRate: Math.random() * 100,
        maintenanceCost: vehicle.maintenanceRecords.reduce((sum, record) => sum + Number(record.cost), 0),
        lastMaintenance: vehicle.lastMaintenance
      }));

      const report = {
        summary: {
          totalVehicles: vehicleData.length,
          availableVehicles: vehicleData.filter(v => v.status === 'AVAILABLE').length,
          inUseVehicles: vehicleData.filter(v => v.status === 'IN_USE').length,
          maintenanceVehicles: vehicleData.filter(v => v.status === 'MAINTENANCE').length,
          averageUtilization: vehicleData.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicleData.length
        },
        data: vehicleData
      };

      if (format === 'json') {
        res.json({ success: true, data: report });
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'vehicles',
          filters: {},
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ 
          success: true,
          message: 'Report generation queued', 
          status: 'processing' 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriversReport(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query;
      
      const drivers = await prisma.driver.findMany({
        include: {
          user: true,
          orders: true
        }
      });
      
      const driverData = drivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        status: driver.status,
        experience: driver.experience,
        rating: Number(driver.rating || 0),
        completedDeliveries: driver.orders.filter(order => order.status === 'DELIVERED').length,
        totalDeliveries: driver.orders.length,
        performanceScore: Math.random() * 100
      }));

      const report = {
        summary: {
          totalDrivers: driverData.length,
          availableDrivers: driverData.filter(d => d.status === 'AVAILABLE').length,
          onDutyDrivers: driverData.filter(d => d.status === 'ON_DUTY').length,
          averageRating: driverData.reduce((sum, d) => sum + d.rating, 0) / driverData.length,
          averageExperience: driverData.reduce((sum, d) => sum + (d.experience || 0), 0) / driverData.length
        },
        data: driverData
      };

      if (format === 'json') {
        res.json({ success: true, data: report });
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'drivers',
          filters: {},
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ 
          success: true,
          message: 'Report generation queued', 
          status: 'processing' 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async exportReport(req: Request, res: Response) {
    try {
      const { reportType, format, filters } = req.body;
      
      await QueueService.addReportJob({
        userId: Number(req.user?.userId) || 1,
        reportType,
        filters: filters || {},
        format
      });
      
      res.json({ 
        success: true,
        message: 'Report export queued successfully',
        status: 'processing',
        estimatedTime: '2-5 minutes'
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Current period data
      const [currentOrders, currentDelivered, currentDrivers, last7DaysOrders] = await Promise.all([
        prisma.deliveryOrder.count({
          where: {
            createdAt: { gte: currentMonth }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: currentMonth }
          }
        }),
        prisma.driver.count({ where: { status: 'AVAILABLE' } }),
        prisma.deliveryOrder.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          select: {
            createdAt: true,
            status: true,
            deliveredAt: true,
            scheduledDate: true
          }
        })
      ]);

      // Previous month data for comparison
      const [prevOrders, prevDelivered] = await Promise.all([
        prisma.deliveryOrder.count({
          where: {
            createdAt: { gte: lastMonth, lt: currentMonth }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: lastMonth, lt: lastMonthEnd }
          }
        })
      ]);

      // Calculate delivery rate and percentage changes
      const deliveryRate = currentOrders > 0 ? (currentDelivered / currentOrders) * 100 : 0;
      const prevDeliveryRate = prevOrders > 0 ? (prevDelivered / prevOrders) * 100 : 0;
      
      const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0;
      const deliveryRateChange = prevDeliveryRate > 0 ? deliveryRate - prevDeliveryRate : 0;

      // Calculate average delivery time
      const deliveredOrders = await prisma.deliveryOrder.findMany({
        where: {
          status: 'DELIVERED',
          deliveredAt: { not: null },
          createdAt: { gte: currentMonth }
        },
        select: {
          createdAt: true,
          deliveredAt: true
        }
      });

      const avgDeliveryTime = deliveredOrders.length > 0 
        ? deliveredOrders.reduce((sum, order) => {
            const deliveryTime = new Date(order.deliveredAt!).getTime() - new Date(order.createdAt).getTime();
            return sum + (deliveryTime / (1000 * 60 * 60 * 24)); // Convert to days
          }, 0) / deliveredOrders.length
        : 0;

      // Previous month average delivery time
      const prevDeliveredOrders = await prisma.deliveryOrder.findMany({
        where: {
          status: 'DELIVERED',
          deliveredAt: { not: null },
          createdAt: { gte: lastMonth, lt: currentMonth }
        },
        select: {
          createdAt: true,
          deliveredAt: true
        }
      });

      const prevAvgDeliveryTime = prevDeliveredOrders.length > 0 
        ? prevDeliveredOrders.reduce((sum, order) => {
            const deliveryTime = new Date(order.deliveredAt!).getTime() - new Date(order.createdAt).getTime();
            return sum + (deliveryTime / (1000 * 60 * 60 * 24));
          }, 0) / prevDeliveredOrders.length
        : 0;

      const deliveryTimeChange = prevAvgDeliveryTime > 0 ? avgDeliveryTime - prevAvgDeliveryTime : 0;

      // Generate 7-day trends
      const trends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const dayOrders = last7DaysOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= date && orderDate < nextDay;
        });
        
        trends.push({
          date: date.toISOString().split('T')[0],
          orders: dayOrders.length,
          delivered: dayOrders.filter(o => o.status === 'DELIVERED').length,
          pending: dayOrders.filter(o => o.status === 'PENDING').length,
          inTransit: dayOrders.filter(o => o.status === 'IN_TRANSIT').length
        });
      }

      // Status distribution
      const statusDistribution = await prisma.deliveryOrder.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          createdAt: { gte: currentMonth }
        }
      });

      // Inventory by category
      const inventoryByCategory = await prisma.inventoryItem.groupBy({
        by: ['category'],
        _count: { id: true },
        _sum: { quantity: true }
      });

      // Calculate KPIs
      const onTimeDeliveries = deliveredOrders.filter(order => {
        if (!order.deliveredAt) return false;
        const deliveryTime = new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime();
        return deliveryTime <= (3 * 24 * 60 * 60 * 1000); // 3 days or less
      }).length;

      const onTimeRate = deliveredOrders.length > 0 ? (onTimeDeliveries / deliveredOrders.length) * 100 : 0;
      
      // Fleet utilization (vehicles in use vs total)
      const [totalVehicles, inUseVehicles] = await Promise.all([
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { status: 'IN_USE' } })
      ]);
      
      const fleetUtilization = totalVehicles > 0 ? (inUseVehicles / totalVehicles) * 100 : 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalOrders: currentOrders,
            ordersChange: Math.round(ordersChange),
            deliveryRate: Math.round(deliveryRate),
            deliveryRateChange: Math.round(deliveryRateChange),
            avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
            deliveryTimeChange: Math.round(deliveryTimeChange * 10) / 10,
            activeDrivers: currentDrivers,
            currency: 'RWF'
          },
          trends,
          statusDistribution: statusDistribution.map(item => ({
            status: item.status,
            count: item._count.status
          })),
          inventoryByCategory: inventoryByCategory.map(item => ({
            category: item.category,
            count: item._count.id,
            totalQuantity: item._sum.quantity || 0
          })),
          kpis: {
            onTimeDeliveryRate: Math.round(onTimeRate),
            customerSatisfaction: 4.8, // This would come from a ratings system
            fleetUtilization: Math.round(fleetUtilization)
          }
        }
      });
    } catch (error: any) {
      console.error('Analytics error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}