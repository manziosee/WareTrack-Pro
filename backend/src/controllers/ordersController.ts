import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

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
          driver: true,
          vehicle: true,
          items: true
        }
      });

      const total = await prisma.deliveryOrder.count();

      res.json({
        success: true,
        data: orders,
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
        { value: 'pending', label: 'Pending' },
        { value: 'dispatched', label: 'Dispatched' },
        { value: 'in_transit', label: 'In Transit' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ];
      res.json({ success: true, data: statuses });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getOrdersByCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orders = await prisma.deliveryOrder.findMany({
        where: { customerId: Number(id) },
        include: {
          driver: true,
          vehicle: true,
          items: true
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

  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await prisma.deliveryOrder.findUnique({
        where: { id: Number(id) },
        include: {
          driver: true,
          vehicle: true,
          items: {
            include: {
              item: true
            }
          }
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
      const { customerName, customerEmail, customerPhone, deliveryAddress, items, notes, priority = 'MEDIUM' } = req.body;

      // Generate order number
      const orderCount = await prisma.deliveryOrder.count();
      const orderNumber = `ORD-${String(orderCount + 1).padStart(3, '0')}`;

      // Calculate total amount from items
      let totalAmount = 0;
      if (items && items.length > 0) {
        totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.unitPrice * item.quantity);
        }, 0);
      }

      const order = await prisma.deliveryOrder.create({
        data: {
          orderNumber,
          customerId: 1,
          customerName,
          deliveryAddress,
          contactNumber: customerPhone,
          priority: priority as any,
          status: 'PENDING',
          orderType: 'delivery',
          paymentMethod: 'cash',
          totalAmount,
          deliveryInstructions: notes,
          createdBy: Number(req.user?.userId) || 1,
          items: {
            create: items?.map((item: any) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit || 'pcs',
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity
            })) || []
          }
        },
        include: {
          items: true
        }
      });

      await cache.invalidateOrderCache();
      
      res.status(201).json({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          orderDate: order.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
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
        data: updateData
      });

      // Send email notifications based on status
      if (status === 'DELIVERED') {
        console.log('✅ Order Delivered Successfully ✅ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'customer@example.com',
          title: 'Order Delivered Successfully ✅',
          name: order.customerName,
          message: `Your order ${order.orderNumber} has been delivered successfully.`,
          template: 'delivery_confirmation'
        });
      } else {
        console.log(`✅ Order ${order.orderNumber} Status Update 📦 - Sent successfully`);
        await QueueService.addEmailJob({
          email: 'customer@example.com',
          title: `Order ${order.orderNumber} Status Update 📦`,
          name: order.customerName,
          message: `Your order ${order.orderNumber} status has been updated to: ${status}`,
          template: 'order_update'
        });
      }

      await cache.invalidateOrderCache();
      
      res.json({ 
        success: true,
        data: order
      });
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

  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { customerName, deliveryAddress, contactNumber, priority, orderType, paymentMethod, deliveryInstructions, scheduledDate } = req.body;

      const order = await prisma.deliveryOrder.update({
        where: { id: Number(id) },
        data: {
          customerName,
          deliveryAddress,
          contactNumber,
          priority: priority as any,
          orderType,
          paymentMethod,
          deliveryInstructions,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null
        }
      });

      await cache.invalidateOrderCache();
      
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

  static async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const order = await prisma.deliveryOrder.update({
        where: { id: Number(id) },
        data: { status: 'CANCELLED' }
      });

      await cache.invalidateOrderCache();
      
      res.json({ 
        success: true,
        message: 'Order cancelled successfully' 
      });
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
}