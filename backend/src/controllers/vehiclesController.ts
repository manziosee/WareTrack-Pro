import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ACTIVE_ORDER_STATUSES, activeOrdersForVehicle, syncVehicleStatus } from '../services/fleetStatus';

export class VehiclesController {
  static async getVehicles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, status, type, search } = req.query;
      // Lists return up to 500 rows so the UI can sort, filter and page instantly
      const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * pageSize;
      
      const vehicles = await prisma.vehicle.findMany({
        skip,
        take: pageSize,
        where: {
          ...(status && { status: status as any }),
          ...(type && { type: type as string }),
          ...(search && {
            OR: [
              { plateNumber: { contains: search as string, mode: 'insensitive' } },
              { type: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        orderBy: { plateNumber: 'asc' },
        include: {
          // Open deliveries: the status is kept in sync with these (see services/fleetStatus)
          orders: {
            where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
            select: { id: true, orderNumber: true, status: true, driver: { select: { id: true, name: true } } },
          },
        }
      });

      const updatedVehicles = vehicles.map(({ orders, ...vehicle }) => ({
        ...vehicle,
        activeOrders: orders,
        activeJobs: orders.length,
        currentDriver: orders.find((o) => o.driver)?.driver || null,
      }));

      const total = await prisma.vehicle.count();

      res.json({
        success: true,
        data: updatedVehicles,
        pagination: { page: Number(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getStatuses(req: Request, res: Response) {
    try {
      const statuses = [
        { value: 'available', label: 'Available' },
        { value: 'in_use', label: 'In Use' },
        { value: 'maintenance', label: 'In Maintenance' },
        { value: 'unavailable', label: 'Unavailable' }
      ];
      res.json({ success: true, data: statuses });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getVehicleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(id) },
        include: {
          orders: true,
          dispatches: true,
          maintenanceRecords: true
        }
      });
      
      if (!vehicle) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }

      res.json({ success: true, data: vehicle });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  /**
   * Everything the vehicle has done since it joined the fleet: every delivery
   * with the driver who drove it, the drivers who have used it, and what it is
   * doing right now.
   */
  static async getVehicleHistory(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        select: { id: true, plateNumber: true, type: true, vehicleModel: true, status: true, createdAt: true },
      });
      if (!vehicle) {
        return res.status(404).json({ success: false, error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' } });
      }
      const [orders, maintenance] = await Promise.all([
        prisma.deliveryOrder.findMany({
          where: { vehicleId: id },
          orderBy: { updatedAt: 'desc' },
          take: 500,
          select: {
            id: true, orderNumber: true, customerName: true, deliveryAddress: true, status: true, totalAmount: true,
            scheduledDate: true, timeSlotStart: true, deliveredAt: true, createdAt: true, updatedAt: true,
            driver: { select: { id: true, name: true, phone: true } },
          },
        }),
        prisma.maintenanceRecord.findMany({
          where: { vehicleId: id },
          orderBy: { scheduledDate: 'desc' },
          select: { id: true, type: true, description: true, scheduledDate: true, completedDate: true, cost: true },
        }),
      ]);
      const isActive = (status: string) => (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
      const active = orders.filter((o) => isActive(o.status));
      const drivers = new Map<number, { id: number; name: string; phone: string; trips: number; lastTrip: Date }>();
      for (const o of orders) {
        if (!o.driver) continue;
        const d = drivers.get(o.driver.id) || { ...o.driver, trips: 0, lastTrip: o.updatedAt };
        d.trips += 1;
        if (o.updatedAt > d.lastTrip) d.lastTrip = o.updatedAt;
        drivers.set(o.driver.id, d);
      }
      // One timeline: deliveries and maintenance, newest first
      const timeline = [
        ...orders.map((o) => ({
          kind: 'delivery' as const,
          at: o.deliveredAt || o.timeSlotStart || o.scheduledDate || o.createdAt,
          orderId: o.id, orderNumber: o.orderNumber, customerName: o.customerName, address: o.deliveryAddress,
          status: o.status, amount: Number(o.totalAmount || 0), driver: o.driver,
        })),
        ...maintenance.map((m) => ({
          kind: 'maintenance' as const,
          at: m.completedDate || m.scheduledDate,
          id: m.id, type: m.type, description: m.description, cost: Number(m.cost || 0), completed: Boolean(m.completedDate),
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const delivered = orders.filter((o) => o.status === 'DELIVERED');
      res.json({
        success: true,
        data: {
          vehicle,
          inUse: active.length > 0,
          active,
          currentDriver: active.find((o) => o.driver)?.driver || null,
          drivers: [...drivers.values()].sort((a, b) => b.trips - a.trips),
          timeline,
          summary: {
            trips: orders.length,
            delivered: delivered.length,
            deliveredValue: delivered.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
            maintenanceCost: maintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0),
            inServiceSince: vehicle.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Vehicle history error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  static async getMaintenanceHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const history = await prisma.maintenanceRecord.findMany({
        where: { vehicleId: Number(id) },
        orderBy: { scheduledDate: 'desc' }
      });
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createVehicle(req: Request, res: Response) {
    try {
      const { plateNumber, vehicleModel, year, type, capacity, status, fuelType } = req.body;
      
      // Get manager ID from authenticated user
      const managerId = (req as any).user?.id;

      const vehicle = await prisma.vehicle.create({
        data: {
          managerId,
          plateNumber,
          type,
          capacity: Number(capacity),
          status: (status || 'AVAILABLE') as any,
          vehicleModel,
          year: year ? Number(year) : null,
          fuelType
        },
        include: {
          manager: true,
          currentDrivers: true
        }
      });

      res.status(201).json({
        success: true,
        data: vehicle
      });
    } catch (error: any) {
      console.error('Create vehicle error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'DUPLICATE_PLATE', message: 'Vehicle with this plate number already exists' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }

  static async scheduleMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, scheduledDate, notes, description, cost, performedBy, priority, serviceProvider } = req.body;

      // Validate required fields
      if (!type || !scheduledDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maintenance type and scheduled date are required' }
        });
      }

      // Check if vehicle exists
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(id) }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }

      // Create maintenance record
      const maintenance = await prisma.maintenanceRecord.create({
        data: {
          vehicleId: Number(id),
          type,
          description: description || notes || type,
          cost: cost ? Number(cost) : 0,
          notes: notes || `${type} scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
          scheduledDate: new Date(scheduledDate),
          performedBy: performedBy || serviceProvider || 'Scheduled'
        }
      });

      // Update vehicle status to maintenance
      await prisma.vehicle.update({
        where: { id: Number(id) },
        data: { 
          status: 'MAINTENANCE',
          lastMaintenance: new Date()
        }
      });

      res.json({ 
        success: true,
        message: 'Maintenance scheduled successfully',
        data: maintenance
      });
    } catch (error: any) {
      console.error('Schedule maintenance error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }

  static async completeMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { maintenanceId, notes, actualCost } = req.body;

      // Update maintenance record
      await prisma.maintenanceRecord.update({
        where: { id: Number(maintenanceId) },
        data: {
          completedDate: new Date(),
          cost: actualCost ? Number(actualCost) : undefined,
          notes: notes
        }
      });

      // Back to available (or in use, if it still has open deliveries)
      await prisma.vehicle.update({
        where: { id: Number(id) },
        data: { 
          status: 'AVAILABLE',
          lastMaintenance: new Date()
        }
      });
      await syncVehicleStatus(Number(id));

      res.json({ 
        success: true,
        message: 'Maintenance completed successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getVehicleTracking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(id) },
        include: {
          orders: {
            where: {
              status: {
                in: ['DISPATCHED', 'IN_TRANSIT']
              }
            },
            include: {
              driver: true
            }
          },
          dispatches: {
            where: {
              status: {
                in: ['DISPATCHED', 'IN_TRANSIT']
              }
            },
            include: {
              order: true,
              driver: true
            }
          },
          currentDrivers: { select: { id: true, name: true, currentLat: true, currentLng: true, lastLocationAt: true }, orderBy: { lastLocationAt: 'desc' }, take: 1 }
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }

      const latestDriver = vehicle.currentDrivers[0];
      const locationIsFresh = latestDriver?.lastLocationAt
        ? Date.now() - latestDriver.lastLocationAt.getTime() <= 10 * 60 * 1000
        : false;
      const hasCoordinates = locationIsFresh && latestDriver?.currentLat !== null && latestDriver?.currentLng !== null;
      const trackingData = {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        status: vehicle.status,
        currentLocation: hasCoordinates ? {
          lat: Number(latestDriver!.currentLat),
          lng: Number(latestDriver!.currentLng),
          address: null,
          timestamp: latestDriver!.lastLocationAt,
          driverName: latestDriver!.name,
        } : null,
        locationIsStale: !hasCoordinates,
        speed: null,
        fuel: null,
        mileage: null,
        activeOrders: vehicle.orders,
        activeDispatches: vehicle.dispatches
      };

      res.json({ success: true, data: trackingData });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { plateNumber, type, capacity, status, fuelType, vehicleModel, year } = req.body;

      // In Use is automatic: it follows the vehicle's open deliveries
      if (status !== undefined) {
        if (!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE'].includes(status)) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be AVAILABLE, MAINTENANCE or UNAVAILABLE' } });
        }
        const active = await activeOrdersForVehicle(Number(id));
        if (status !== 'IN_USE' && active.length) {
          const list = active.slice(0, 5).map((o) => o.orderNumber).join(', ');
          return res.status(409).json({
            success: false,
            error: {
              code: 'VEHICLE_BUSY',
              message: `This vehicle is on ${active.length} open ${active.length === 1 ? 'delivery' : 'deliveries'} (${list}). It becomes available automatically when ${active.length === 1 ? 'it is' : 'they are'} finished, or reassign ${active.length === 1 ? 'it' : 'them'} first.`,
            },
          });
        }
        if (status === 'IN_USE' && !active.length) {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_ACTIVE_DELIVERY', message: 'In Use is set automatically when the vehicle is assigned to a delivery.' },
          });
        }
      }

      const vehicle = await prisma.vehicle.update({
        where: { id: Number(id) },
        data: {
          plateNumber,
          type,
          capacity: capacity ? Number(capacity) : undefined,
          status: status as any,
          fuelType,
          vehicleModel,
          year: year ? Number(year) : undefined
        }
      });

      res.json({ success: true, data: vehicle });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'DUPLICATE_PLATE', message: 'Vehicle with this plate number already exists' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.vehicle.delete({
        where: { id: Number(id) }
      });
      
      res.json({ 
        success: true,
        message: 'Vehicle deleted successfully' 
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}
