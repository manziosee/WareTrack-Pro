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
          order: { include: { items: { include: { item: true } } } },
          driver: true,
          vehicle: true,
          createdByUser: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.dispatch.count();

      res.json({
        success: true,
        data: dispatches,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      console.error('Get dispatches error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getDispatchById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dispatch = await prisma.dispatch.findUnique({
        where: { id: Number(id) },
        include: {
          order: { include: { items: { include: { item: true } } } },
          driver: true,
          vehicle: true,
          createdByUser: true,
          proof: true
        }
      });
      
      if (!dispatch) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }

      res.json({ success: true, data: dispatch });
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

      // Validate required fields
      if (!orderId || !driverId || !vehicleId || !scheduledDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Order, driver, vehicle, and scheduled date are required' }
        });
      }

      // Check if order exists and is available
      const order = await prisma.deliveryOrder.findUnique({
        where: { id: Number(orderId) }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: { code: 'ORDER_NOT_AVAILABLE', message: 'Order is not available for dispatch' }
        });
      }

      // Check if driver exists and is available
      const driver = await prisma.driver.findUnique({
        where: { id: Number(driverId) }
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
        });
      }

      // Check if vehicle exists and is available
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(vehicleId) }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' }
        });
      }

      // Create dispatch and update related records in transaction
      const dispatch = await prisma.$transaction(async (tx) => {
        const newDispatch = await tx.dispatch.create({
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
            order: { include: { items: { include: { item: true } } } },
            driver: true,
            vehicle: true
          }
        });

        // Update order
        await tx.deliveryOrder.update({
          where: { id: Number(orderId) },
          data: { 
            status: 'PENDING',
            driverId: Number(driverId),
            vehicleId: Number(vehicleId)
          }
        });

        // Update driver status
        await tx.driver.update({
          where: { id: Number(driverId) },
          data: { status: 'ON_DUTY' }
        });

        // Update vehicle status
        await tx.vehicle.update({
          where: { id: Number(vehicleId) },
          data: { status: 'IN_USE' }
        });

        return newDispatch;
      });

      // Send notification
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
    } catch (error: any) {
      console.error('Create dispatch error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }

  static async updateDispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { orderId, driverId, vehicleId, scheduledDate, notes, estimatedDelivery, fuelAllowance, route } = req.body;

      // Get existing dispatch
      const existingDispatch = await prisma.dispatch.findUnique({
        where: { id: Number(id) },
        include: { driver: true, vehicle: true }
      });

      if (!existingDispatch) {
        return res.status(404).json({
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }

      // Update dispatch and related records in transaction
      const dispatch = await prisma.$transaction(async (tx) => {
        // If driver changed, update statuses
        if (driverId && Number(driverId) !== existingDispatch.driverId) {
          // Set old driver to available
          await tx.driver.update({
            where: { id: existingDispatch.driverId },
            data: { status: 'AVAILABLE' }
          });
          // Set new driver to on duty
          await tx.driver.update({
            where: { id: Number(driverId) },
            data: { status: 'ON_DUTY' }
          });
        }

        // If vehicle changed, update statuses
        if (vehicleId && Number(vehicleId) !== existingDispatch.vehicleId) {
          // Set old vehicle to available
          await tx.vehicle.update({
            where: { id: existingDispatch.vehicleId },
            data: { status: 'AVAILABLE' }
          });
          // Set new vehicle to in use
          await tx.vehicle.update({
            where: { id: Number(vehicleId) },
            data: { status: 'IN_USE' }
          });
        }

        // Update dispatch
        return await tx.dispatch.update({
          where: { id: Number(id) },
          data: {
            ...(orderId && { orderId: Number(orderId) }),
            ...(driverId && { driverId: Number(driverId) }),
            ...(vehicleId && { vehicleId: Number(vehicleId) }),
            ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
            ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
            ...(fuelAllowance !== undefined && { fuelAllowance: Number(fuelAllowance) }),
            route,
            notes
          },
          include: {
            order: { include: { items: { include: { item: true } } } },
            driver: true,
            vehicle: true
          }
        });
      });

      res.json({ success: true, data: dispatch });
    } catch (error: any) {
      console.error('Update dispatch error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
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

      // Sync order status
      let orderStatus = dispatch.order.status;
      if (status === 'DISPATCHED') orderStatus = 'DISPATCHED';
      else if (status === 'IN_TRANSIT') orderStatus = 'IN_TRANSIT';
      else if (status === 'DELIVERED') orderStatus = 'DELIVERED';

      if (orderStatus !== dispatch.order.status) {
        await prisma.deliveryOrder.update({
          where: { id: dispatch.orderId },
          data: { 
            status: orderStatus,
            ...(status === 'DELIVERED' && { deliveredAt: new Date() })
          }
        });
      }

      // Sync vehicle and driver status
      if (status === 'DELIVERED') {
        await prisma.vehicle.update({
          where: { id: dispatch.vehicleId },
          data: { status: 'AVAILABLE' }
        });
        await prisma.driver.update({
          where: { id: dispatch.driverId },
          data: { status: 'AVAILABLE' }
        });
      }

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

  static async deleteDispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get dispatch to restore statuses
      const dispatch = await prisma.dispatch.findUnique({
        where: { id: Number(id) },
        include: { order: true, driver: true, vehicle: true }
      });

      if (!dispatch) {
        return res.status(404).json({
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }

      // Delete dispatch and restore statuses in transaction
      await prisma.$transaction(async (tx) => {
        // Restore order status
        await tx.deliveryOrder.update({
          where: { id: dispatch.orderId },
          data: { 
            status: 'PENDING',
            driverId: null,
            vehicleId: null
          }
        });

        // Restore driver status
        await tx.driver.update({
          where: { id: dispatch.driverId },
          data: { status: 'AVAILABLE' }
        });

        // Restore vehicle status
        await tx.vehicle.update({
          where: { id: dispatch.vehicleId },
          data: { status: 'AVAILABLE' }
        });

        // Delete dispatch
        await tx.dispatch.delete({
          where: { id: Number(id) }
        });
      });

      res.json({ 
        success: true,
        message: 'Dispatch deleted successfully' 
      });
    } catch (error: any) {
      console.error('Delete dispatch error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'DISPATCH_NOT_FOUND', message: 'Dispatch not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
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

  static async syncStatuses(req: Request, res: Response) {
    try {
      const dispatches = await prisma.dispatch.findMany({
        include: {
          order: true,
          driver: true,
          vehicle: true
        }
      });

      let syncedCount = 0;

      for (const dispatch of dispatches) {
        if (dispatch.order.status !== dispatch.status) {
          await prisma.deliveryOrder.update({
            where: { id: dispatch.orderId },
            data: { 
              status: dispatch.status,
              ...(dispatch.status === 'DELIVERED' && { deliveredAt: dispatch.actualDelivery })
            }
          });
          syncedCount++;
        }
      }

      res.json({
        success: true,
        message: `Synced ${syncedCount} order statuses with dispatch statuses`
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}
