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
          ...(status && { status: (status as string).toUpperCase() as any }),
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

      // Add formatted currency to orders
      const formattedOrders = orders.map(order => ({
        ...order,
        formattedAmount: `RWF ${Number(order.totalAmount).toLocaleString()}`,
        currency: 'RWF'
      }));

      const total = await prisma.deliveryOrder.count();

      res.json({
        success: true,
        data: formattedOrders,
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
        { value: 'PENDING', label: 'Pending' },
        { value: 'DISPATCHED', label: 'Dispatched' },
        { value: 'IN_TRANSIT', label: 'In Transit' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'CANCELLED', label: 'Cancelled' }
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
      const { 
        customerName, 
        customerEmail, 
        customerPhone, 
        contactNumber,
        deliveryAddress, 
        items, 
        notes,
        deliveryInstructions,
        priority = 'MEDIUM',
        orderType = 'delivery',
        paymentMethod = 'cash',
        scheduledDate
      } = req.body;

      console.log('Creating order with items:', items);

      // Validate items and check inventory availability
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_ITEMS', message: 'Order must contain at least one item' }
        });
      }

      // Check inventory availability for all items
      for (const item of items) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: Number(item.itemId) }
        });

        if (!inventoryItem) {
          return res.status(400).json({
            success: false,
            error: { code: 'ITEM_NOT_FOUND', message: `Item with ID ${item.itemId} not found` }
          });
        }

        if (inventoryItem.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            error: { 
              code: 'INSUFFICIENT_STOCK', 
              message: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}` 
            }
          });
        }
      }

      // Generate order number
      const orderCount = await prisma.deliveryOrder.count();
      const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

      // Calculate total amount from items
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: Number(item.itemId) }
        });

        const itemTotal = Number(inventoryItem!.unitPrice) * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          itemId: Number(item.itemId),
          itemName: inventoryItem!.name,
          quantity: item.quantity,
          unit: inventoryItem!.unit,
          unitPrice: Number(inventoryItem!.unitPrice),
          totalPrice: itemTotal
        });
      }

      // Create order with transaction to ensure data consistency
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.deliveryOrder.create({
          data: {
            orderNumber,
            customerId: 1,
            customerName,
            deliveryAddress,
            contactNumber: contactNumber || customerPhone || '',
            priority: priority as any,
            status: 'PENDING',
            orderType: orderType || 'delivery',
            paymentMethod: paymentMethod || 'cash',
            totalAmount,
            deliveryInstructions: deliveryInstructions || notes,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            createdBy: Number(req.user?.userId) || 1,
            items: {
              create: orderItems
            }
          },
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        });

        // Reduce inventory quantities and create history records
        for (const item of items) {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: Number(item.itemId) }
          });

          const newQuantity = inventoryItem!.quantity - item.quantity;

          // Update inventory quantity
          await tx.inventoryItem.update({
            where: { id: Number(item.itemId) },
            data: { 
              quantity: newQuantity,
              lastUpdated: new Date()
            }
          });

          // Create inventory history record
          await tx.inventoryHistory.create({
            data: {
              itemId: Number(item.itemId),
              action: 'stock_out',
              quantity: item.quantity,
              previousQuantity: inventoryItem!.quantity,
              newQuantity: newQuantity,
              orderId: newOrder.id,
              notes: `Stock reduced for order ${orderNumber}`,
              performedBy: Number(req.user?.userId) || 1
            }
          });
        }

        return newOrder;
      });

      await cache.invalidateOrderCache();
      await cache.invalidateInventoryCache();
      
      res.status(201).json({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          formattedAmount: `RWF ${Number(order.totalAmount).toLocaleString()}`,
          currency: 'RWF',
          orderDate: order.createdAt,
          items: order.items
        }
      });
    } catch (error: any) {
      console.error('Order creation error:', error);
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
        data: updateData
      });

      // Sync dispatch status with order status
      const dispatch = await prisma.dispatch.findFirst({
        where: { orderId: Number(id) }
      });

      if (dispatch) {
        const dispatchUpdateData: any = { status };
        
        if (status === 'DELIVERED') {
          dispatchUpdateData.actualDelivery = new Date();
        } else if (status === 'DISPATCHED') {
          dispatchUpdateData.dispatchedAt = new Date();
        }

        await prisma.dispatch.update({
          where: { id: dispatch.id },
          data: dispatchUpdateData
        });

        // Update vehicle status based on dispatch status
        if (status === 'DELIVERED') {
          await prisma.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: { status: 'AVAILABLE' }
          });
        } else if (status === 'DISPATCHED' || status === 'IN_TRANSIT') {
          await prisma.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: { status: 'IN_USE' }
          });
        }
      }

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

  static async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Delete order with transaction to handle related records
      await prisma.$transaction(async (tx) => {
        // Delete order items first
        await tx.orderItem.deleteMany({
          where: { orderId: Number(id) }
        });
        
        // Delete related dispatch records
        await tx.dispatch.deleteMany({
          where: { orderId: Number(id) }
        });
        
        // Delete the order
        await tx.deliveryOrder.delete({
          where: { id: Number(id) }
        });
      });

      await cache.invalidateOrderCache();
      
      res.json({ 
        success: true,
        message: 'Order deleted successfully' 
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