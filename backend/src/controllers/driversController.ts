import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class DriversController {
  static async getDrivers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const drivers = await prisma.driver.findMany({
        skip,
        take: Number(limit),
        where: {
          ...(status && { status: status as any }),
          ...(search && {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { licenseNumber: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          user: true,
          currentVehicle: true
        }
      });

      const total = await prisma.driver.count();

      res.json({
        success: true,
        data: drivers,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getAvailableDrivers(req: Request, res: Response) {
    try {
      const drivers = await prisma.driver.findMany({
        where: { status: 'AVAILABLE' },
        include: {
          user: true,
          currentVehicle: true
        }
      });
      res.json({ success: true, data: drivers });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriverById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const driver = await prisma.driver.findUnique({
        where: { id: Number(id) },
        include: {
          user: true,
          currentVehicle: true,
          orders: true,
          dispatches: true
        }
      });
      
      if (!driver) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
        });
      }

      res.json({ success: true, data: driver });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriverAssignments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, startDate, endDate } = req.query;
      
      // Mock assignments - implement with actual orders/dispatch table
      const assignments = [
        {
          id: '1',
          orderId: '1',
          orderNumber: 'ORD-001',
          status: 'in_progress',
          pickupLocation: 'Warehouse A',
          deliveryAddress: '123 Main St, City',
          scheduledPickup: new Date().toISOString(),
          scheduledDelivery: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          vehicle: {
            id: '1',
            registrationNumber: 'ABC123'
          },
          items: [
            {
              id: '1',
              name: 'Product 1',
              quantity: 2
            }
          ]
        }
      ];
      
      res.json({ success: true, data: assignments });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createDriver(req: Request, res: Response) {
    try {
      const { userId, licenseNumber, licenseExpiry, licenseClass, emergencyContact, address, status, experience } = req.body;

      // Get user name from users table
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) }
      });
      if (!user) {
        return res.status(400).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      const driver = await prisma.driver.create({
        data: {
          userId: Number(userId),
          name: user.name,
          licenseNumber,
          phone: user.phone || '000-000-0000',
          status: (status || 'AVAILABLE') as any,
          experience: experience ? Number(experience) : 0,
          rating: 0
        }
      });

      res.status(201).json({
        success: true,
        data: {
          id: driver.id,
          userId: driver.userId,
          name: driver.name,
          licenseNumber: driver.licenseNumber,
          status: driver.status
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'DUPLICATE_LICENSE', message: 'Driver with this license number already exists' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateDriver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { licenseNumber, phone, status, experience, rating } = req.body;

      const driver = await prisma.driver.update({
        where: { id: Number(id) },
        data: {
          licenseNumber,
          phone,
          status: status as any,
          experience: experience ? Number(experience) : undefined,
          rating: rating ? Number(rating) : undefined
        }
      });

      res.json({ success: true, data: driver });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
        });
      }
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'DUPLICATE_LICENSE', message: 'Driver with this license number already exists' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteDriver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.driver.delete({
        where: { id: Number(id) }
      });
      
      res.json({ 
        success: true,
        message: 'Driver deleted successfully' 
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}