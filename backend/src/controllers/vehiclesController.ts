import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class VehiclesController {
  static async getVehicles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, type, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Get current user's managed vehicles
      const managerId = (req as any).user?.id;
      
      const vehicles = await prisma.vehicle.findMany({
        skip,
        take: Number(limit),
        where: {
          managerId, // Only show vehicles managed by current user
          ...(status && { status: status as any }),
          ...(type && { type: type as string }),
          ...(search && {
            OR: [
              { plateNumber: { contains: search as string, mode: 'insensitive' } },
              { type: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          manager: true,
          currentDrivers: true
        }
      });

      const total = await prisma.vehicle.count({
        where: { managerId }
      });

      res.json({
        success: true,
        data: vehicles,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
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
      const { type, scheduledDate, notes, description, cost, performedBy } = req.body;

      // Create maintenance record
      const maintenance = await prisma.maintenanceRecord.create({
        data: {
          vehicleId: Number(id),
          type,
          description: description || type,
          cost: cost ? Number(cost) : 0,
          notes,
          scheduledDate: new Date(scheduledDate),
          performedBy: performedBy || 'System'
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
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
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

      // Update vehicle status back to available
      await prisma.vehicle.update({
        where: { id: Number(id) },
        data: { 
          status: 'AVAILABLE',
          lastMaintenance: new Date()
        }
      });

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
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }

      // Mock GPS tracking data
      const trackingData = {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        status: vehicle.status,
        currentLocation: {
          lat: -1.9441 + (Math.random() - 0.5) * 0.1, // Kigali area
          lng: 30.0619 + (Math.random() - 0.5) * 0.1,
          address: 'Kigali, Rwanda',
          timestamp: new Date()
        },
        speed: vehicle.status === 'IN_USE' ? Math.floor(Math.random() * 60) + 20 : 0,
        fuel: Math.floor(Math.random() * 100),
        mileage: Math.floor(Math.random() * 100000) + 50000,
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