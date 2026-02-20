import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class OrdersController {
  static async getOrders(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const orders = await prisma.deliveryOrder.findMany({
        skip,
        take: Number(limit),
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
          vehicle: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.deliveryOrder.count();

      res.json({
        success: true,
        data: orders,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
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
      const { 
        customerName, customerEmail, customerPhone, contactNumber,
        deliveryAddress, priority = 'MEDIUM', orderType = 'Delivery',
        paymentMethod = 'Cash', scheduledDate, deliveryInstructions,
        items = []
      } = req.body;

      // Validate required fields
      if (!customerName || !deliveryAddress || !contactNumber) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Customer name, delivery address, and contact number are required' }
        });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' }
        });
      }

      // Generate order number
      const orderCount = await prisma.deliveryOrder.count();
      const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

      // Calculate total from items
      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: Number(item.itemId || item.inventoryId) }
        });

        if (!inventoryItem) {
          return res.status(400).json({
            success: false,
            error: { code: 'ITEM_NOT_FOUND', message: `Item with ID ${item.itemId || item.inventoryId} not found` }
          });
        }

        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice || item.price || inventoryItem.unitPrice);
        const itemTotal = quantity * unitPrice;

        processedItems.push({
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          quantity,
          unit: item.unit || inventoryItem.unit,
          unitPrice,
          totalPrice: itemTotal
        });

        totalAmount += itemTotal;
      }

      // Create order with items in transaction
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.deliveryOrder.create({
          data: {
            orderNumber,
            customerId: 1,
            customerName,
            deliveryAddress,
            contactNumber: contactNumber || customerPhone || '',
            priority: priority as any,
            status: 'PENDING',
            orderType,
            paymentMethod,
            totalAmount,
            deliveryInstructions,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            createdBy: Number(req.user?.userId) || 1,
            items: {
              create: processedItems
            }
          },
          include: {
            items: { include: { item: true } },
            driver: true,
            vehicle: true
          }
        });

        // Update inventory for each item
        for (const item of processedItems) {
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { decrement: item.quantity } }
          });
        }

        return newOrder;
      });

      res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
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

      const updateData: any = { status };
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
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
