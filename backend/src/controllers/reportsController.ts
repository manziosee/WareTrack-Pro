import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { QueueService } from '../services/queueService';

export class ReportsController {
  static async getSalesReport(req: Request, res: Response) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      
      const orders = await db.select().from(schema.deliveryOrders)
        .where(eq(schema.deliveryOrders.status, 'delivered'));

      const salesData = orders.map(order => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: parseFloat(order.totalAmount),
        deliveredAt: order.deliveredAt,
        paymentMethod: order.paymentMethod
      }));

      const totalSales = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
      
      const report = {
        summary: {
          totalOrders: salesData.length,
          totalSales,
          averageOrderValue: totalSales / salesData.length || 0
        },
        data: salesData
      };

      if (format === 'json') {
        res.json(report);
      } else {
        // Queue report generation for PDF/Excel
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'sales',
          filters: { startDate, endDate },
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ message: 'Report generation queued', status: 'processing' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async getInventoryReport(req: Request, res: Response) {
    try {
      const { category, lowStock, format = 'json' } = req.query;
      
      const items = await db.select().from(schema.inventoryItems);
      
      const inventoryData = items.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unitPrice: parseFloat(item.unitPrice),
        totalValue: item.quantity * parseFloat(item.unitPrice),
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
        res.json(report);
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'inventory',
          filters: { category, lowStock },
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ message: 'Report generation queued', status: 'processing' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async getVehiclesReport(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query;
      
      const vehicles = await db.select().from(schema.vehicles);
      
      const vehicleData = vehicles.map(vehicle => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        capacity: vehicle.capacity,
        status: vehicle.status,
        utilizationRate: Math.random() * 100, // Mock utilization
        maintenanceCost: Math.random() * 500000, // Mock cost
        lastMaintenance: vehicle.lastMaintenance
      }));

      const report = {
        summary: {
          totalVehicles: vehicleData.length,
          availableVehicles: vehicleData.filter(v => v.status === 'available').length,
          inUseVehicles: vehicleData.filter(v => v.status === 'in_use').length,
          maintenanceVehicles: vehicleData.filter(v => v.status === 'maintenance').length,
          averageUtilization: vehicleData.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicleData.length
        },
        data: vehicleData
      };

      if (format === 'json') {
        res.json(report);
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'vehicles',
          filters: {},
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ message: 'Report generation queued', status: 'processing' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async getDriversReport(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query;
      
      const drivers = await db.select().from(schema.drivers);
      
      const driverData = drivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        status: driver.status,
        experience: driver.experience,
        rating: parseFloat(driver.rating || '0'),
        completedDeliveries: Math.floor(Math.random() * 100), // Mock data
        onTimeDeliveries: Math.floor(Math.random() * 90), // Mock data
        performanceScore: Math.random() * 100 // Mock data
      }));

      const report = {
        summary: {
          totalDrivers: driverData.length,
          availableDrivers: driverData.filter(d => d.status === 'available').length,
          onDutyDrivers: driverData.filter(d => d.status === 'on_duty').length,
          averageRating: driverData.reduce((sum, d) => sum + d.rating, 0) / driverData.length,
          averageExperience: driverData.reduce((sum, d) => sum + (d.experience || 0), 0) / driverData.length
        },
        data: driverData
      };

      if (format === 'json') {
        res.json(report);
      } else {
        await QueueService.addReportJob({
          userId: Number(req.user?.userId) || 1,
          reportType: 'drivers',
          filters: {},
          format: format as 'pdf' | 'excel'
        });
        
        res.json({ message: 'Report generation queued', status: 'processing' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
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
        message: 'Report export queued successfully',
        status: 'processing',
        estimatedTime: '2-5 minutes'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}