import { emitEvent } from '../services/events';
import { ORDER_STATUSES, onOrderStatusChanged } from '../services/orderLifecycle';
import { syncDriverStatus, syncVehicleStatus } from '../services/fleetStatus';
import { accountForCustomer, createOrderRecord, OrderInputError } from '../services/orderCreation';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class OrdersController {
  static async getOrders(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, search, status } = req.query;
      // Lists return up to 500 rows so the UI can sort, filter and page instantly
      const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

      const orders = await prisma.deliveryOrder.findMany({
        skip,
        take: pageSize,
        where: {
          ...(status && { status: status as any }),
          ...(search && {
            OR: [
              { orderNumber: { contains: search as string, mode: 'insensitive' } },
              { customerName: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          items: { include: { item: true } },
          driver: true,
          vehicle: true,
          // Latest dispatch, so the Tracking and Dispatch pages can link to each other
          dispatches: { select: { id: true, status: true, scheduledDate: true, estimatedDelivery: true }, orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.deliveryOrder.count();

      res.json({
        success: true,
        data: orders,
        pagination: { page: Number(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await prisma.deliveryOrder.findUnique({
        where: { id: Number(id) },
        include: {
          items: { include: { item: true } },
          driver: true,
          vehicle: true,
          createdByUser: true
        }
      });
      
      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createOrder(req: Request, res: Response) {
    try {
      const body = req.body || {};
      // Every order belongs to a customer account (found or created by name) so balances add up
      let accountId = body.accountId ? Number(body.accountId) : null;
      if (!accountId && body.customerName) {
        const account = await accountForCustomer(String(body.customerName), {
          phone: body.contactNumber || body.customerPhone, address: body.deliveryAddress, email: body.customerEmail,
        });
        accountId = account?.id ?? null;
      }
      const order = await createOrderRecord(
        { ...body, accountId },
        {
          createdBy: Number(req.user?.userId) || 1,
          source: 'STAFF',
          trustPrices: true,
          allowOverCredit: req.user?.role === 'ADMIN' && body.overrideCredit === true,
        }
      );
      res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      if (error instanceof OrderInputError) {
        return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
      }
      console.error('Create order error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        customerName, customerEmail, deliveryAddress, contactNumber,
        priority, status, orderType, paymentMethod,
        scheduledDate, deliveryInstructions, items
      } = req.body;

      // Get existing order
      const existingOrder = await prisma.deliveryOrder.findUnique({
        where: { id: Number(id) },
        include: { items: true }
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      // Calculate new total if items provided
      let totalAmount = existingOrder.totalAmount;
      if (items && items.length > 0) {
        totalAmount = items.reduce((sum: number, item: any) => {
          const price = Number(item.unitPrice || item.price || 0);
          return sum + (price * Number(item.quantity));
        }, 0);
      }

      // Update order
      const order = await prisma.$transaction(async (tx) => {
        // If items are being updated, delete old items and create new ones
        if (items && items.length > 0) {
          // Restore inventory for old items
          for (const oldItem of existingOrder.items) {
            await tx.inventoryItem.update({
              where: { id: oldItem.itemId },
              data: { quantity: { increment: oldItem.quantity } }
            });
          }

          // Delete old items
          await tx.orderItem.deleteMany({
            where: { orderId: Number(id) }
          });

          // Process new items
          const processedItems = [];
          for (const item of items) {
            const inventoryItem = await tx.inventoryItem.findUnique({
              where: { id: Number(item.itemId || item.inventoryId) }
            });

            if (inventoryItem) {
              const quantity = Number(item.quantity);
              const unitPrice = Number(item.unitPrice || item.price || inventoryItem.unitPrice);

              processedItems.push({
                itemId: inventoryItem.id,
                itemName: inventoryItem.name,
                quantity,
                unit: item.unit || inventoryItem.unit,
                unitPrice,
                totalPrice: quantity * unitPrice
              });

              // Deduct from inventory
              await tx.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: { quantity: { decrement: quantity } }
              });
            }
          }

          // Create new items
          await tx.orderItem.createMany({
            data: processedItems.map(item => ({ ...item, orderId: Number(id) }))
          });
        }

        // Update order details
        return await tx.deliveryOrder.update({
          where: { id: Number(id) },
          data: {
            customerName,
            deliveryAddress,
            contactNumber,
            priority: priority as any,
            status: status as any,
            orderType,
            paymentMethod,
            totalAmount,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            deliveryInstructions
          },
          include: {
            items: { include: { item: true } },
            driver: true,
            vehicle: true
          }
        });
      });

      if (status && status !== existingOrder.status) await onOrderStatusChanged(order.id, existingOrder.status);
      res.json({ success: true, data: order });
    } catch (error: any) {
      console.error('Update order error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }

  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` }
        });
      }

      const previous = await prisma.deliveryOrder.findUnique({ where: { id: Number(id) }, select: { status: true, driverId: true } });
      if (previous && !previous.driverId && ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_DRIVER', message: 'Assign a driver and vehicle first (Dispatch), then update the status.' }
        });
      }
      const updateData: any = { status };
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
        updateData.deliveryAttempts = { increment: 1 };
      }

      const order = await prisma.deliveryOrder.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          items: { include: { item: true } },
          driver: true,
          vehicle: true
        }
      });

      await onOrderStatusChanged(order.id, previous?.status);
      res.json({ success: true, data: order });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get order with items to restore inventory
      const order = await prisma.deliveryOrder.findUnique({
        where: { id: Number(id) },
        include: { items: true }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      // Delete order and restore inventory in transaction
      await prisma.$transaction(async (tx) => {
        // Restore inventory for each item
        for (const item of order.items) {
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { increment: item.quantity } }
          });
        }

        // Delete order (cascades to items)
        await tx.deliveryOrder.delete({
          where: { id: Number(id) }
        });
      });
      // Free the driver and vehicle if this was their open delivery
      await syncDriverStatus(order.driverId);
      await syncVehicleStatus(order.vehicleId);

      res.json({ 
        success: true,
        message: 'Order deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete order error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }
}
