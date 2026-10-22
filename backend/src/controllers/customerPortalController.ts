import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { createOrderRecord } from '../services/orderCreation';
import { accountPosition } from '../services/finance';
import { getTenantContext, runWithTenant, runWithoutTenant } from '../lib/tenantContext';

export class CustomerPortalController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, address, preferredDeliveryWindow, deliveryInstructions, contactPreference } = req.body;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const preferredContact = String(contactPreference || 'ANY').toUpperCase();
      if (!['ANY', 'PHONE', 'EMAIL', 'SMS', 'WHATSAPP'].includes(preferredContact)) {
        return res.status(400).json({ success: false, error: { message: 'contactPreference must be ANY, PHONE, EMAIL, SMS, or WHATSAPP' } });
      }
      if (typeof preferredDeliveryWindow === 'string' && preferredDeliveryWindow.length > 100) return res.status(400).json({ success: false, error: { message: 'preferredDeliveryWindow must be at most 100 characters' } });
      if (typeof deliveryInstructions === 'string' && deliveryInstructions.length > 2000) return res.status(400).json({ success: false, error: { message: 'deliveryInstructions must be at most 2000 characters' } });
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const customer = await prisma.$queryRaw`
        INSERT INTO customers (company_id, branch_id, name, email, password, phone, address, preferred_delivery_window, delivery_instructions, contact_preference)
        VALUES (${tenant.companyId}, ${tenant.branchId}, ${name}, ${email}, ${hashedPassword}, ${phone}, ${address}, ${preferredDeliveryWindow || null}, ${deliveryInstructions || null}, ${preferredContact})
        RETURNING id, name, email, phone, address, preferred_delivery_window, delivery_instructions, contact_preference, status, created_at
      `;
      
      res.json({ success: true, data: customer });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const customers: any = await prisma.$queryRaw`
        SELECT * FROM customers WHERE email = ${email} AND company_id = ${tenant.companyId} AND status = 'ACTIVE'
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
        { customerId: customer.id, email: customer.email, companyId: tenant.companyId, branchId: tenant.branchId, type: 'customer' },
        getJwtSecret(),
        { expiresIn: '7d' }
      );
      
      res.json({ success: true, data: { token, customer: {
        id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address,
        preferredDeliveryWindow: customer.preferred_delivery_window,
        deliveryInstructions: customer.delivery_instructions,
        contactPreference: customer.contact_preference,
      } } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.customer!.customerId },
        select: {
          id: true, name: true, email: true, phone: true, address: true,
          preferredDeliveryWindow: true, deliveryInstructions: true, contactPreference: true,
        },
      });
      if (!customer) return res.status(404).json({ success: false, error: { message: 'Customer account not found' } });
      res.json({ success: true, data: customer });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async getAccountSummary(req: Request, res: Response) {
    try {
      const accounts = await runWithoutTenant(() => prisma.customerAccount.findMany({
        where: { companyId: req.customer!.companyId, email: { equals: req.customer!.email, mode: 'insensitive' } },
        select: { id: true, accountNumber: true, name: true, creditLimit: true, paymentTermsDays: true, status: true },
      }));
      const positions = await runWithoutTenant(() => Promise.all(accounts.map(async (account) => ({
        accountNumber: account.accountNumber,
        name: account.name,
        creditLimit: Number(account.creditLimit),
        status: account.status,
        ...await accountPosition(account.id, account.paymentTermsDays),
      }))));
      res.json({
        success: true,
        data: {
          accounts: positions,
          balance: positions.reduce((sum, account) => sum + account.balance, 0),
          overdue: positions.reduce((sum, account) => sum + account.overdue, 0),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { phone, address, preferredDeliveryWindow, deliveryInstructions, contactPreference } = req.body || {};
      const allowedContacts = ['ANY', 'PHONE', 'EMAIL', 'SMS', 'WHATSAPP'];
      if (contactPreference !== undefined && !allowedContacts.includes(String(contactPreference).toUpperCase())) {
        return res.status(400).json({ success: false, error: { message: 'contactPreference must be ANY, PHONE, EMAIL, SMS, or WHATSAPP' } });
      }
      const boundedString = (value: unknown, max: number, label: string) => {
        if (value === undefined || value === null) return value;
        if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be a string of at most ${max} characters`);
        return value.trim() || null;
      };
      let data: Record<string, unknown>;
      try {
        data = {
          phone: boundedString(phone, 40, 'phone'),
          address: boundedString(address, 500, 'address'),
          preferredDeliveryWindow: boundedString(preferredDeliveryWindow, 100, 'preferredDeliveryWindow'),
          deliveryInstructions: boundedString(deliveryInstructions, 2000, 'deliveryInstructions'),
          ...(contactPreference !== undefined ? { contactPreference: String(contactPreference).toUpperCase() } : {}),
        };
      } catch (error: any) {
        return res.status(400).json({ success: false, error: { message: error.message } });
      }
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      const customer = await prisma.customer.update({
        where: { id: req.customer!.customerId },
        data: data as any,
        select: {
          id: true, name: true, email: true, phone: true, address: true,
          preferredDeliveryWindow: true, deliveryInstructions: true, contactPreference: true,
        },
      });
      res.json({ success: true, data: customer });
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
      
      const orders = await runWithoutTenant(() => prisma.deliveryOrder.findMany({
        where: { customerId: Number(customerId), companyId: req.customer!.companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } },
          invoice: { select: { invoiceNumber: true, subtotal: true, tax: true, total: true, status: true, issuedAt: true, dueDate: true, paidAt: true } },
        }
      }));
      
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
      const order = await runWithoutTenant(() => prisma.deliveryOrder.findFirst({ where: { id: Number(orderId), customerId, companyId: req.customer!.companyId } }));
      if (!order || order.status !== 'DELIVERED' || !order.driverId || (driverId && Number(driverId) !== order.driverId)) {
        return res.status(404).json({ success: false, error: { message: 'Delivered order not found for this customer' } });
      }
      if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, error: { message: 'Rating must be a whole number from 1 to 5' } });
      }
      
      const ratingRecord = await prisma.$queryRaw`
        INSERT INTO customer_ratings (company_id, branch_id, customer_id, order_id, driver_id, rating, comment)
        VALUES (${order.companyId}, ${order.branchId}, ${customerId}, ${order.id}, ${order.driverId}, ${rating}, ${comment ? String(comment).slice(0, 2000) : null})
        ON CONFLICT (customer_id, order_id) DO UPDATE SET
          rating = ${rating}, comment = ${comment ? String(comment).slice(0, 2000) : null}
        RETURNING *
      `;
      
      const avgRating: any = await prisma.$queryRaw`
        SELECT AVG(rating) as avg_rating FROM customer_ratings
        WHERE driver_id = ${order.driverId} AND company_id = ${req.customer!.companyId}
          AND (${req.customer!.branchId}::int IS NULL OR branch_id IS NULL OR branch_id = ${req.customer!.branchId})
      `;
      
      await runWithTenant({ companyId: order.companyId, branchId: order.branchId }, () => prisma.driver.update({
        where: { id: order.driverId },
        data: { rating: Number(avgRating[0]?.avg_rating) || 0 }
      }));
      
      res.json({ success: true, data: ratingRecord });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: process.env.NODE_ENV === 'production' ? 'Request failed' : error.message } });
    }
  }

  static async reorder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const customerId = req.customer!.customerId;
      
      const originalOrder: any = await runWithoutTenant(() => prisma.deliveryOrder.findFirst({
        where: { id: Number(orderId), customerId, companyId: req.customer!.companyId },
        include: { items: true }
      }));
      
      if (!originalOrder || originalOrder.customerId !== customerId) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }
      const savedProfile = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { phone: true, address: true, deliveryInstructions: true },
      });
      
      const newOrder = await runWithTenant({ companyId: originalOrder.companyId, branchId: originalOrder.branchId }, () => createOrderRecord({
        customerId,
        customerName: originalOrder.customerName,
        customerEmail: originalOrder.customerEmail,
        deliveryAddress: savedProfile?.address || originalOrder.deliveryAddress,
        contactNumber: savedProfile?.phone || originalOrder.contactNumber,
        deliveryInstructions: savedProfile?.deliveryInstructions || originalOrder.deliveryInstructions,
        orderType: originalOrder.orderType,
        paymentMethod: originalOrder.paymentMethod,
        priority: 'MEDIUM',
        // Today's prices for this customer (price list, promotions, discount), not the old ones
        accountId: originalOrder.accountId ?? undefined,
        items: originalOrder.items.map((item: any) => ({ itemId: item.itemId, quantity: item.packQuantity || item.quantity, packagingId: item.packagingId || undefined })),
      }, { createdBy: 1, source: 'ONLINE' }));

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
    const customerId = Number(payload.customerId);
    const companyId = Number(payload.companyId || 1);
    const branchId = payload.branchId ? Number(payload.branchId) : null;
    const headerCompany = req.header('X-Company-Id');
    if (!Number.isInteger(companyId) || (headerCompany && Number(headerCompany) !== companyId)) return res.status(403).json({ success: false, error: { message: 'This customer session is for another company' } });
    void prisma.customer.findFirst({ where: { id: customerId, companyId, status: 'ACTIVE' } }).then((customer) => {
      if (!customer) return res.status(401).json({ success: false, error: { message: 'Customer account is inactive' } });
      req.customer = { customerId, email: payload.email, companyId, branchId };
      runWithTenant({ companyId, branchId }, next);
    }).catch(next);
  } catch {
    return res.status(403).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

declare global {
  namespace Express {
    interface Request {
      customer?: { customerId: number; email?: string; companyId: number; branchId: number | null };
    }
  }
}
