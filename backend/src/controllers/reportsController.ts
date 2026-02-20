import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ReportsController {
  static async getAnalytics(req: Request, res: Response) {
    try {
      const analytics = {
        totalOrders: await prisma.deliveryOrder.count(),
        totalInventory: await prisma.inventoryItem.count(),
        totalVehicles: await prisma.vehicle.count(),
        totalDrivers: await prisma.driver.count()
      };
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getSalesReport(req: Request, res: Response) {
    try {
      const orders = await prisma.deliveryOrder.findMany({
        include: { items: { include: { item: true } } }
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getInventoryReport(req: Request, res: Response) {
    try {
      const inventory = await prisma.inventoryItem.findMany();
      res.json({ success: true, data: inventory });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getVehiclesReport(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany();
      res.json({ success: true, data: vehicles });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriversReport(req: Request, res: Response) {
    try {
      const drivers = await prisma.driver.findMany({ include: { user: true } });
      res.json({ success: true, data: drivers });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async exportReport(req: Request, res: Response) {
    try {
      const { type } = req.body;
      res.json({ success: true, message: `Export ${type} report functionality` });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}
