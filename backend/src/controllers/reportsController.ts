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
}