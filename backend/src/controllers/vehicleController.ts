import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, like, and, or, sql, desc } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';

const cacheService = CacheService.getInstance();

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    
    const conditions = [];
    if (status) conditions.push(eq(schema.vehicles.status, status as any));
    if (type) conditions.push(eq(schema.vehicles.type, type as string));
    if (search) {
      conditions.push(
        or(
          like(schema.vehicles.plateNumber, `%${search}%`),
          like(schema.vehicles.type, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [vehicles, totalResult] = await Promise.all([
      db.select().from(schema.vehicles)
        .where(whereClause)
        .orderBy(desc(schema.vehicles.createdAt))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(schema.vehicles)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count || 0;

    res.json({
      vehicles,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getVehicle = async (req: Request, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const [vehicle] = await db.select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.id, vehicleId))
      .limit(1);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const { plateNumber, type, capacity, status, fuelType, vehicleModel, year } = req.body;

    const existingVehicle = await db.select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.plateNumber, plateNumber))
      .limit(1);
    
    if (existingVehicle.length > 0) {
      return res.status(400).json({ message: 'Vehicle with this plate number already exists' });
    }

    const [vehicle] = await db.insert(schema.vehicles).values({
      plateNumber,
      type,
      capacity,
      status,
      fuelType,
      vehicleModel,
      year
    }).returning();

    res.status(201).json({ message: 'Vehicle created successfully', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { type, capacity, status, fuelType, vehicleModel, year, lastMaintenance } = req.body;

    const vehicleId = parseInt(req.params.id);
    const [vehicle] = await db.update(schema.vehicles)
      .set({ type, capacity, status, fuelType, vehicleModel, year, lastMaintenance, updatedAt: new Date() })
      .where(eq(schema.vehicles.id, vehicleId))
      .returning();

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle updated successfully', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const [deletedVehicle] = await db.delete(schema.vehicles)
      .where(eq(schema.vehicles.id, vehicleId))
      .returning();
    
    if (!deletedVehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAvailableVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await db.select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.status, 'available'))
      .orderBy(schema.vehicles.plateNumber);
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getVehicleStats = async (req: Request, res: Response) => {
  try {
    const [totalResult, availableResult, inUseResult, maintenanceResult, typeStatsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.vehicles),
      db.select({ count: sql<number>`count(*)` }).from(schema.vehicles).where(eq(schema.vehicles.status, 'available')),
      db.select({ count: sql<number>`count(*)` }).from(schema.vehicles).where(eq(schema.vehicles.status, 'in_use')),
      db.select({ count: sql<number>`count(*)` }).from(schema.vehicles).where(eq(schema.vehicles.status, 'maintenance')),
      db.select({
        type: schema.vehicles.type,
        count: sql<number>`count(*)`
      }).from(schema.vehicles).groupBy(schema.vehicles.type)
    ]);

    res.json({
      totalVehicles: totalResult[0]?.count || 0,
      availableVehicles: availableResult[0]?.count || 0,
      inUseVehicles: inUseResult[0]?.count || 0,
      maintenanceVehicles: maintenanceResult[0]?.count || 0,
      typeStats: typeStatsResult
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};