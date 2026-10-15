import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';

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
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
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
        { customerId: customer.id, email: customer.email, type: 'customer' },
        getJwtSecret(),
        { expiresIn: '7d' }
      );
      
      res.json({ success: true, data: { token, customer: { id: customer.id, name: customer.name, email: customer.email } } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async getOrders(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      if (Number(customerId) !== req.customer?.customerId) {
        return res.status(403).json({ success: false, error: { message: 'You can only view your own orders' } });
      }
      
      const orders = await prisma.deliveryOrder.findMany({
        where: { customerId: Number(customerId) },
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } }
        }
      });
      
      res.json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async trackOrder(req: Request, res: Response) {
    try {
      const { orderNumber } = req.params;
      
      // Public endpoint: return only what a customer needs to follow the delivery
      const order = await prisma.deliveryOrder.findUnique({
        where: { orderNumber: String(orderNumber) },
        select: {
          orderNumber: true,
          status: true,
          priority: true,
          scheduledDate: true,
          deliveredAt: true,
          updatedAt: true,
          driver: { select: { name: true } }
        }
      });

      if (!order) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }
      
      res.json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async rateDriver(req: Request, res: Response) {
    try {
      const { orderId, driverId, rating, comment } = req.body;
      const customerId = req.customer!.customerId;
      if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, error: { message: 'Rating must be a whole number from 1 to 5' } });
      }
      
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
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async reorder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const customerId = req.customer!.customerId;
      
      const originalOrder: any = await prisma.deliveryOrder.findUnique({
        where: { id: Number(orderId) },
        include: { items: true }
      });
      
      if (!originalOrder || originalOrder.customerId !== customerId) {
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
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }
}

/** Verifies a customer-portal token and exposes the customer's id on the request. */
export const authenticateCustomer = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Customer token required' } });
  }
  try {
    const payload: any = jwt.verify(token, getJwtSecret());
    if (payload?.type !== 'customer' || !payload.customerId) {
      return res.status(403).json({ success: false, error: { message: 'Invalid customer token' } });
    }
    req.customer = { customerId: Number(payload.customerId), email: payload.email };
    next();
  } catch {
    return res.status(403).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

declare global {
  namespace Express {
    interface Request {
      customer?: { customerId: number; email?: string };
    }
  }
}
