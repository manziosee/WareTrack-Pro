import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

export class DriversController {
  static async getDrivers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const drivers = await db.select().from(schema.drivers).limit(Number(limit)).offset(offset);

      res.json({
        success: true,
        data: drivers,
        pagination: { page: Number(page), limit: Number(limit), total: drivers.length, totalPages: Math.ceil(drivers.length / Number(limit)) }
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
      const drivers = await db.select().from(schema.drivers).where(eq(schema.drivers.status, 'available'));
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getDriverById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [driver] = await db.select().from(schema.drivers).where(eq(schema.drivers.id, Number(id))).limit(1);
      
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      res.json(driver);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
      const { userId, licenseNumber, licenseExpiry, licenseClass, emergencyContact, address, status } = req.body;

      // Get user name from users table
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!user) {
        return res.status(400).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      const [driver] = await db.insert(schema.drivers).values({
        userId,
        name: user.name,
        licenseNumber,
        phone: user.phone || '000-000-0000',
        status: status || 'available',
        experience: 0,
        rating: '0'
      }).returning();

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
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateDriver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { licenseNumber, phone, status, experience } = req.body;

      const [driver] = await db.update(schema.drivers)
        .set({ licenseNumber, phone, status, experience, updatedAt: new Date() })
        .where(eq(schema.drivers.id, Number(id)))
        .returning();

      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      res.json(driver);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteDriver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await db.delete(schema.drivers).where(eq(schema.drivers.id, Number(id)));
      
      res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}