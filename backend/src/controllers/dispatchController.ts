import { NotificationService } from '../services/notificationService';
import { onOrderStatusChanged } from '../services/orderLifecycle';
import { reconcileFleet, syncDriverStatus, syncFleetForOrder, syncVehicleStatus } from '../services/fleetStatus';
import { emitEvent } from '../services/events';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class DispatchController {
  static async getDispatches(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, status, startDate, endDate } = req.query;
      // Lists return up to 500 rows so the UI can sort, filter and page instantly
      const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

      const dispatches = await prisma.dispatch.findMany({
        skip,
        take: pageSize,
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
        pagination: { page: Number(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
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

      const openDispatch = await prisma.dispatch.findFirst({ where: { orderId: order.id, status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] } } });
      if (order.driverId || openDispatch) {
        return res.status(409).json({
          success: false,
          error: { code: 'ALREADY_ASSIGNED', message: 'This order already has a driver. Edit its dispatch to change the driver or vehicle.' }
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

        // The driver is on duty and the vehicle in use until this delivery ends
        await syncDriverStatus(Number(driverId), tx);
        await syncVehicleStatus(Number(vehicleId), tx);

        return newDispatch;
      });

      // Tell the driver (in the app, and by email only if they have a real address)
      const assignment = `You have a new delivery: ${dispatch.order.orderNumber} to ${dispatch.order.customerName}, scheduled for ${new Date(scheduledDate).toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })}.`;
      if (dispatch.driver.userId) {
        NotificationService.createNotification({
          userId: dispatch.driver.userId, type: 'ORDER_UPDATE', severity: 'INFO', title: 'New delivery assigned 🚛', message: assignment,
        }).catch(() => undefined);
      }
      if (dispatch.driver.email && !/@(example\.|drivers\.waretrack\.rw$)/.test(dispatch.driver.email)) {
        QueueService.addEmailJob({
          email: dispatch.driver.email, title: 'New Delivery Assignment 🚛', name: dispatch.driver.name, message: assignment, template: 'delivery_assignment',
        }).catch(() => undefined);
      }
      emitEvent('dispatch.created', { id: dispatch.id, orderId: dispatch.orderId, orderNumber: dispatch.order.orderNumber, driver: dispatch.driver.name });
      await onOrderStatusChanged(dispatch.orderId, 'PENDING');

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
        // Keep the order's driver and vehicle in step with its dispatch
        if ((driverId && Number(driverId) !== existingDispatch.driverId) || (vehicleId && Number(vehicleId) !== existingDispatch.vehicleId)) {
          await tx.deliveryOrder.update({
            where: { id: existingDispatch.orderId },
            data: {
              ...(driverId && { driverId: Number(driverId) }),
              ...(vehicleId && { vehicleId: Number(vehicleId) }),
            },
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

      // Old and new driver/vehicle: busy only if they still have open deliveries
      await syncFleetForOrder(dispatch.orderId, {
        driverIds: [existingDispatch.driverId],
        vehicleIds: [existingDispatch.vehicleId],
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
      if (!['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be PENDING, DISPATCHED, IN_TRANSIT, DELIVERED or CANCELLED' } });
      }

      const updateData: any = { status, ...(notes !== undefined && { notes }) };
      
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

      // The order always follows its dispatch. Cancelling a dispatch cancels the
      // assignment: the order goes back to Pending, without a driver, ready to re-dispatch.
      const cancelled = status === 'CANCELLED';
      const orderStatus = cancelled ? 'PENDING' : status;
      if (orderStatus !== dispatch.order.status || cancelled) {
        await prisma.deliveryOrder.update({
          where: { id: dispatch.orderId },
          data: { 
            status: orderStatus,
            ...(status === 'DELIVERED' && { deliveredAt: new Date(), deliveryAttempts: { increment: 1 } }),
            ...(cancelled && { driverId: null, vehicleId: null }),
          }
        });
        await onOrderStatusChanged(dispatch.orderId, dispatch.order.status);
      }

      // Driver and vehicle become available once they have no open deliveries left
      await syncDriverStatus(dispatch.driverId);
      await syncVehicleStatus(dispatch.vehicleId);

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

        // Delete dispatch
        await tx.dispatch.delete({
          where: { id: Number(id) }
        });

        // Free the driver and vehicle unless they have other open deliveries
        await syncDriverStatus(dispatch.driverId, tx);
        await syncVehicleStatus(dispatch.vehicleId, tx);
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
        where: { status: 'PENDING', driverId: null },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          deliveryAddress: true,
          priority: true,
          totalAmount: true,
          createdAt: true,
          packingStatus: true
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

  /** Repair tool: close dispatches whose order is finished and recompute every driver and vehicle status. */
  static async syncStatuses(req: Request, res: Response) {
    try {
      const { closedDispatches } = await reconcileFleet();
      res.json({ success: true, message: `Closed ${closedDispatches} stale dispatches and refreshed driver and vehicle statuses` });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}
