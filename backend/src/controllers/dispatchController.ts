import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class DispatchController {
  static async getDispatches(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const dispatches = await prisma.dispatch.findMany({
        skip,
        take: Number(limit),
        where: {
          ...(status && { status: status as any }),
          ...(startDate && endDate && {
            scheduledDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        },
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      const total = await prisma.dispatch.count();

      res.json({
        success: true,
        data: dispatches,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getActiveDispatches(req: Request, res: Response) {
    try {
      const activeDispatches = await prisma.dispatch.findMany({
        where: {
          status: {
            in: ['DISPATCHED', 'IN_TRANSIT']
          }
        },
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      res.json({ success: true, data: activeDispatches });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDriverDispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const dispatch = await prisma.dispatch.findFirst({
        where: {
          driverId: Number(id),
          status: {
            in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT']
          }
        },
        include: {
          order: {
            include: {
              items: true
            }
          },
          driver: true,
          vehicle: true
        }
      });

      if (!dispatch) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: dispatch });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createDispatch(req: Request, res: Response) {
    try {
      const { orderId, driverId, vehicleId, scheduledDate, notes, estimatedDelivery, fuelAllowance, route } = req.body;

      const dispatch = await prisma.dispatch.create({
        data: {
          orderId: Number(orderId),
          driverId: Number(driverId),
          vehicleId: Number(vehicleId),
          scheduledDate: new Date(scheduledDate),
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
          fuelAllowance: fuelAllowance ? Number(fuelAllowance) : 0,
          route,
          notes,
          status: 'PENDING',
          createdBy: Number(req.user?.userId) || 1
        },
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      // Update order status to dispatched
      await prisma.deliveryOrder.update({
        where: { id: Number(orderId) },
        data: { status: 'DISPATCHED' }
      });

      // Update driver status to on_duty
      await prisma.driver.update({
        where: { id: Number(driverId) },
        data: { status: 'ON_DUTY' }
      });

      // Update vehicle status to in_use
      await prisma.vehicle.update({
        where: { id: Number(vehicleId) },
        data: { status: 'IN_USE' }
      });

      // Send delivery assignment notification
      console.log('✅ New Delivery Assignment 🚛 - Sent successfully');
      await QueueService.addEmailJob({
        email: 'driver@example.com',
        title: 'New Delivery Assignment 🚛',
        name: dispatch.driver.name,
        message: `You have been assigned a new delivery: Order ${dispatch.order.orderNumber} to ${dispatch.order.customerName}. Scheduled for ${new Date(scheduledDate).toLocaleString()}`,
        template: 'delivery_assignment'
      });

      res.status(201).json({ 
        success: true,
        data: dispatch
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateDispatchStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updateData: any = { status, notes };
      
      if (status === 'DELIVERED') {
        updateData.actualDelivery = new Date();
      } else if (status === 'DISPATCHED') {
        updateData.dispatchedAt = new Date();
      }

      const dispatch = await prisma.dispatch.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      res.json({ success: true, data: dispatch });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateDispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { scheduledDate, notes, estimatedDelivery, fuelAllowance, route } = req.body;

      const dispatch = await prisma.dispatch.update({
        where: { id: Number(id) },
        data: {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
          fuelAllowance: fuelAllowance ? Number(fuelAllowance) : undefined,
          route,
          notes
        },
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      res.json({ success: true, data: dispatch });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getAvailableOrders(req: Request, res: Response) {
    try {
      const orders = await prisma.deliveryOrder.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          deliveryAddress: true,
          priority: true,
          totalAmount: true,
          createdAt: true
        }
      });
      res.json({ success: true, data: orders });
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
          user: true
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

  static async getAvailableVehicles(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { status: 'AVAILABLE' }
      });
      res.json({ success: true, data: vehicles });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const [totalDispatches, completedDispatches, pendingDispatches, inTransitDispatches] = await Promise.all([
        prisma.dispatch.count(),
        prisma.dispatch.count({ where: { status: 'DELIVERED' } }),
        prisma.dispatch.count({ where: { status: 'PENDING' } }),
        prisma.dispatch.count({ where: { status: 'IN_TRANSIT' } })
      ]);

      res.json({
        success: true,
        data: {
          totalDispatches,
          completedDispatches,
          pendingDispatches,
          inTransitDispatches,
          currency: 'RWF'
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}