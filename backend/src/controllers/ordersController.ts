import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, ilike, or } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class OrdersController {
  static async getOrders(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const orders = await db.select().from(schema.deliveryOrders).limit(Number(limit)).offset(offset);

      res.json({
        success: true,
        data: orders,
        pagination: { page: Number(page), limit: Number(limit), total: orders.length, totalPages: Math.ceil(orders.length / Number(limit)) }
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
      const orders = await db.select().from(schema.deliveryOrders).where(eq(schema.deliveryOrders.customerId, Number(id)));
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [order] = await db.select().from(schema.deliveryOrders).where(eq(schema.deliveryOrders.id, Number(id))).limit(1);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createOrder(req: Request, res: Response) {
    try {
      const { customerName, customerEmail, customerPhone, deliveryAddress, items, notes } = req.body;

      // Generate order number
      const orderCount = await db.select().from(schema.deliveryOrders);
      const orderNumber = `ORD-${String(orderCount.length + 1).padStart(3, '0')}`;

      // Calculate total amount from items
      let totalAmount = '0';
      if (items && items.length > 0) {
        totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.price * item.quantity);
        }, 0).toString();
      }

      const [order] = await db.insert(schema.deliveryOrders).values({
        orderNumber,
        customerId: 1,
        customerName,
        deliveryAddress,
        contactNumber: customerPhone,
        priority: 'medium',
        status: 'pending',
        orderType: 'delivery',
        paymentMethod: 'cash',
        totalAmount,
        deliveryInstructions: notes,
        scheduledDate: null,
        createdBy: Number(req.user?.userId) || 1
      }).returning();

      await cache.invalidateOrderCache();
      
      res.status(201).json({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: parseFloat(order.totalAmount),
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

      const updateData: any = { status, updatedAt: new Date() };
      
      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const [order] = await db.update(schema.deliveryOrders)
        .set(updateData)
        .where(eq(schema.deliveryOrders.id, Number(id)))
        .returning();

      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: { message: 'Order not found' }
        });
      }

      // Send email notifications based on status
      if (status === 'delivered') {
        console.log('✅ Order Delivered Successfully ✅ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'customer@example.com', // Replace with actual customer email
          title: 'Order Delivered Successfully ✅',
          name: order.customerName,
          message: `Your order ${order.orderNumber} has been delivered successfully.`,
          template: 'delivery_confirmation'
        });
      } else {
        console.log(`✅ Order ${order.orderNumber} Status Update 📦 - Sent successfully`);
        await QueueService.addEmailJob({
          email: 'customer@example.com', // Replace with actual customer email
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
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }

  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { customerName, deliveryAddress, contactNumber, priority, orderType, paymentMethod, deliveryInstructions, scheduledDate } = req.body;

      const [order] = await db.update(schema.deliveryOrders)
        .set({ 
          customerName, 
          deliveryAddress, 
          contactNumber, 
          priority, 
          orderType, 
          paymentMethod, 
          deliveryInstructions, 
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          updatedAt: new Date() 
        })
        .where(eq(schema.deliveryOrders.id, Number(id)))
        .returning();

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      await cache.invalidateOrderCache();
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const [order] = await db.update(schema.deliveryOrders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.deliveryOrders.id, Number(id)))
        .returning();

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      await cache.invalidateOrderCache();
      
      res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}