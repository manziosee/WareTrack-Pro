import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ACTIVE_ORDER_STATUSES, activeOrdersForDriver } from '../services/fleetStatus';

export class DriversController {
  static async getDrivers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, status, search } = req.query;
      // Lists return up to 500 rows so the UI can sort, filter and page instantly
      const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

      const drivers = await prisma.driver.findMany({
        skip,
        take: pageSize,
        where: {
          ...(status && { status: status as any }),
          ...(search && {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { licenseNumber: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        orderBy: { name: 'asc' },
        include: {
          currentVehicle: true,
          // Open deliveries: the status is kept in sync with these (see services/fleetStatus)
          orders: {
            where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
            select: { id: true, orderNumber: true, status: true, vehicle: { select: { id: true, plateNumber: true } } },
          },
        }
      });

      const updatedDrivers = drivers.map(({ orders, ...driver }) => ({
        ...driver,
        activeOrders: orders,
        activeJobs: orders.length,
      }));

      const total = await prisma.driver.count();

      res.json({
        success: true,
        data: updatedDrivers,
        pagination: { page: Number(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
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

  /** Every delivery the driver has had: open ones first, then finished, with the vehicle used. */
  static async getDriverAssignments(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const driver = await prisma.driver.findUnique({
        where: { id },
        select: { id: true, name: true, status: true, currentVehicle: { select: { id: true, plateNumber: true, type: true, vehicleModel: true } } },
      });
      if (!driver) {
        return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
      }
      const orders = await prisma.deliveryOrder.findMany({
        where: { driverId: id },
        orderBy: [{ updatedAt: 'desc' }],
        take: 300,
        select: {
          id: true, orderNumber: true, customerName: true, deliveryAddress: true, status: true, priority: true,
          totalAmount: true, scheduledDate: true, timeSlotStart: true, deliveredAt: true, createdAt: true, updatedAt: true,
          failureReason: true, vehicle: { select: { id: true, plateNumber: true, type: true } },
        },
      });
      const active = orders.filter((o) => (ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status));
      const finished = orders.filter((o) => !(ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status));
      const vehicles = new Map<number, { id: number; plateNumber: string; type: string; trips: number }>();
      for (const o of orders) {
        if (!o.vehicle) continue;
        const v = vehicles.get(o.vehicle.id) || { ...o.vehicle, trips: 0 };
        v.trips += 1;
        vehicles.set(o.vehicle.id, v);
      }
      const delivered = finished.filter((o) => o.status === 'DELIVERED');
      res.json({
        success: true,
        data: {
          driver,
          active,
          finished,
          vehiclesUsed: [...vehicles.values()].sort((a, b) => b.trips - a.trips),
          summary: {
            total: orders.length,
            active: active.length,
            delivered: delivered.length,
            failed: finished.filter((o) => o.status === 'FAILED').length,
            deliveredValue: delivered.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
          },
        },
      });
    } catch (error) {
      console.error('Driver assignments error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  static async createDriver(req: Request, res: Response) {
    try {
      const { 
        name, email, phone, licenseNumber, licenseExpiry, 
        address, emergencyContact, emergencyContactName, 
        dateOfBirth, hireDate, status 
      } = req.body;
      
      // Get manager ID from authenticated user
      const managerId = (req as any).user?.id;

      const driver = await prisma.driver.create({
        data: {
          managerId,
          name,
          email,
          licenseNumber,
          phone,
          status: (status || 'AVAILABLE') as any,
          address,
          emergencyContact,
          emergencyContactName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          hireDate: hireDate ? new Date(hireDate) : null,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          experience: 0,
          rating: 0
        },
        include: {
          manager: true,
          currentVehicle: true
        }
      });

      res.status(201).json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Create driver error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'DUPLICATE_LICENSE', message: 'Driver with this license number already exists' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }

  static async updateDriver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name, email, licenseNumber, phone, status, experience, rating, address,
        licenseExpiry, emergencyContact, emergencyContactName, dateOfBirth, hireDate,
      } = req.body;

      // On Duty is automatic: it follows the driver's open deliveries
      if (status !== undefined) {
        if (!['AVAILABLE', 'OFF_DUTY', 'ON_DUTY'].includes(status)) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be AVAILABLE or OFF_DUTY' } });
        }
        const active = await activeOrdersForDriver(Number(id));
        if (status !== 'ON_DUTY' && active.length) {
          const list = active.slice(0, 5).map((o) => o.orderNumber).join(', ');
          return res.status(409).json({
            success: false,
            error: {
              code: 'DRIVER_BUSY',
              message: `This driver still has ${active.length} open ${active.length === 1 ? 'delivery' : 'deliveries'} (${list}). They become available automatically when ${active.length === 1 ? 'it is' : 'they are'} finished, or reassign ${active.length === 1 ? 'it' : 'them'} first.`,
            },
          });
        }
        if (status === 'ON_DUTY' && !active.length) {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_ACTIVE_DELIVERY', message: 'On Duty is set automatically when the driver is given a delivery.' },
          });
        }
      }

      const driver = await prisma.driver.update({
        where: { id: Number(id) },
        data: {
          name: name || undefined,
          email: email === undefined ? undefined : email || null,
          licenseNumber: licenseNumber || undefined,
          phone: phone || undefined,
          status: status as any,
          address: address === undefined ? undefined : address || null,
          emergencyContact: emergencyContact === undefined ? undefined : emergencyContact || null,
          emergencyContactName: emergencyContactName === undefined ? undefined : emergencyContactName || null,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          hireDate: hireDate ? new Date(hireDate) : undefined,
          experience: experience !== undefined && experience !== '' ? Number(experience) : undefined,
          rating: rating !== undefined && rating !== '' ? Number(rating) : undefined
        },
        include: { currentVehicle: true }
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