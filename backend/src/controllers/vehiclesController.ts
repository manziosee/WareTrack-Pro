import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

export class VehiclesController {
  static async getVehicles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, type, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const vehicles = await db.select().from(schema.vehicles).limit(Number(limit)).offset(offset);

      res.json({
        success: true,
        data: vehicles,
        pagination: { page: Number(page), limit: Number(limit), total: vehicles.length, totalPages: Math.ceil(vehicles.length / Number(limit)) }
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
      const [vehicle] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, Number(id))).limit(1);
      
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getMaintenanceHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Mock maintenance history - implement with actual maintenance table
      const history = [
        { id: 1, vehicleId: Number(id), type: 'Oil Change', date: new Date(), cost: '50000', notes: 'Regular maintenance' }
      ];
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createVehicle(req: Request, res: Response) {
    try {
      const { registrationNumber, make, model, year, type, capacity, status, purchaseDate, lastMaintenance, nextMaintenance } = req.body;

      const [vehicle] = await db.insert(schema.vehicles).values({
        plateNumber: registrationNumber,
        type,
        capacity,
        status: status || 'available',
        vehicleModel: model,
        year,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null
      }).returning();

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
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async scheduleMaintenance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, scheduledDate, notes } = req.body;

      // Update vehicle status to maintenance
      await db.update(schema.vehicles)
        .set({ status: 'maintenance', lastMaintenance: new Date() })
        .where(eq(schema.vehicles.id, Number(id)));

      res.json({ message: 'Maintenance scheduled successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { plateNumber, type, capacity, status, fuelType, vehicleModel, year } = req.body;

      const [vehicle] = await db.update(schema.vehicles)
        .set({ plateNumber, type, capacity, status, fuelType, vehicleModel, year, updatedAt: new Date() })
        .where(eq(schema.vehicles.id, Number(id)))
        .returning();

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await db.delete(schema.vehicles).where(eq(schema.vehicles.id, Number(id)));
      
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}