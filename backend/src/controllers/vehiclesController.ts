import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class VehiclesController {
  static async getVehicles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, type, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const vehicles = await prisma.vehicle.findMany({
        skip,
        take: Number(limit),
        where: {
          ...(status && { status: status as any }),
          ...(type && { type: type as string }),
          ...(search && {
            OR: [
              { plateNumber: { contains: search as string, mode: 'insensitive' } },
              { type: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        }
      });

      const total = await prisma.vehicle.count();

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
      const { registrationNumber, make, model, year, type, capacity, status, purchaseDate, lastMaintenance, nextMaintenance, fuelType } = req.body;

      const vehicle = await prisma.vehicle.create({
        data: {
          plateNumber: registrationNumber,
          type,
          capacity: Number(capacity),
          status: (status || 'AVAILABLE') as any,
          vehicleModel: model,
          year: year ? Number(year) : null,
          fuelType,
          lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null
        }
      });

      res.status(201).json({
        success: true,
        data: {
          id: vehicle.id,
          registrationNumber: vehicle.plateNumber,
          type: vehicle.type,
          status: vehicle.status,
          createdAt: vehicle.createdAt
        }
      });
    } catch (error: any) {
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

  static async scheduleMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, scheduledDate, notes, description, cost } = req.body;

      // Create maintenance record
      const maintenance = await prisma.maintenanceRecord.create({
        data: {
          vehicleId: Number(id),
          type,
          description: description || type,
          cost: cost ? Number(cost) : 0,
          notes,
          scheduledDate: new Date(scheduledDate)
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