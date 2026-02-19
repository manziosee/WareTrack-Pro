import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class CustomerPortalController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, address } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const customer = await prisma.$queryRaw`
        INSERT INTO customers (name, email, password, phone, address)
        VALUES (${name}, ${email}, ${hashedPassword}, ${phone}, ${address})
        RETURNING id, name, email, phone, address, status, created_at
      `;
      
      res.json({ success: true, data: customer });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const customers: any = await prisma.$queryRaw`
        SELECT * FROM customers WHERE email = ${email} AND status = 'ACTIVE'
      `;
      
      if (!customers || customers.length === 0) {
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      }
      
      const customer = customers[0];
      const validPassword = await bcrypt.compare(password, customer.password);
      
      if (!validPassword) {
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      }
      
      const token = jwt.sign(
        { customerId: customer.id, email: customer.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      
      res.json({ success: true, data: { token, customer: { id: customer.id, name: customer.name, email: customer.email } } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getOrders(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      
      const orders = await prisma.$queryRaw`
        SELECT do.*, d.name as driver_name, v.plate_number
        FROM delivery_orders do
        LEFT JOIN drivers d ON do.driver_id = d.id
        LEFT JOIN vehicles v ON do.vehicle_id = v.id
        WHERE do.customer_id = ${customerId}
        ORDER BY do.created_at DESC
      `;
      
      res.json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async trackOrder(req: Request, res: Response) {
    try {
      const { orderNumber } = req.params;
      
      const order: any = await prisma.$queryRaw`
        SELECT do.*, d.name as driver_name, d.phone as driver_phone,
               v.plate_number, dp.photo_url, dp.signature_data, dp.confirmation_code
        FROM delivery_orders do
        LEFT JOIN drivers d ON do.driver_id = d.id
        LEFT JOIN vehicles v ON do.vehicle_id = v.id
        LEFT JOIN delivery_proofs dp ON do.id = dp.order_id
        WHERE do.order_number = ${orderNumber}
      `;
      
      res.json({ success: true, data: order[0] || null });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async rateDriver(req: Request, res: Response) {
    try {
      const { customerId, orderId, driverId, rating, comment } = req.body;
      
      const ratingRecord = await prisma.$executeRaw`
        INSERT INTO customer_ratings (customer_id, order_id, driver_id, rating, comment)
        VALUES (${customerId}, ${orderId}, ${driverId}, ${rating}, ${comment})
        ON CONFLICT (customer_id, order_id) DO UPDATE SET
          rating = ${rating}, comment = ${comment}
        RETURNING *
      `;
      
      const avgRating: any = await prisma.$queryRaw`
        SELECT AVG(rating) as avg_rating FROM customer_ratings WHERE driver_id = ${driverId}
      `;
      
      await prisma.driver.update({
        where: { id: driverId },
        data: { rating: avgRating[0].avg_rating }
      });
      
      res.json({ success: true, data: ratingRecord });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async reorder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const customerId = req.body.customerId;
      
      const originalOrder: any = await prisma.deliveryOrder.findUnique({
        where: { id: Number(orderId) },
        include: { items: true }
      });
      
      if (!originalOrder) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }
      
      const orderNumber = `ORD-${Date.now()}`;
      const newOrder = await prisma.deliveryOrder.create({
        data: {
          orderNumber,
          customerId: Number(customerId),
          customerName: originalOrder.customerName,
          deliveryAddress: originalOrder.deliveryAddress,
          contactNumber: originalOrder.contactNumber,
          priority: 'MEDIUM',
          status: 'PENDING',
          orderType: originalOrder.orderType,
          paymentMethod: originalOrder.paymentMethod,
          totalAmount: originalOrder.totalAmount,
          createdBy: 1
        }
      });
      
      for (const item of originalOrder.items) {
        await prisma.orderItem.create({
          data: {
            orderId: newOrder.id,
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }
        });
      }
      
      res.json({ success: true, data: newOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
