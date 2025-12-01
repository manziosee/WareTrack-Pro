import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { QueueService } from '../services/queueService';

export class DispatchController {
  static async getDispatches(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Mock dispatch data - implement with actual dispatch table
      const dispatches = [
        {
          id: '1',
          orderId: '1',
          driverId: '1',
          vehicleId: '1',
          status: 'in_progress',
          startTime: new Date().toISOString(),
          estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          actualArrival: null,
          currentLocation: {
            lat: 0,
            lng: 0
          },
          route: [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 }
          ]
        }
      ];

      res.json({
        success: true,
        data: dispatches,
        pagination: { page: Number(page), limit: Number(limit), total: dispatches.length, totalPages: Math.ceil(dispatches.length / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getActiveDispatches(req: Request, res: Response) {
    try {
      // Mock active dispatches
      const activeDispatches = [
        {
          id: '1',
          orderId: '1',
          driverName: 'David Brown',
          vehicleRegistration: 'RAD 123A',
          status: 'in_progress',
          currentLocation: {
            lat: 0,
            lng: 0
          },
          nextStop: 'Customer Location',
          estimatedArrival: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }
      ];

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
      
      // Mock driver's current dispatch
      const dispatch = {
        id: '1',
        orderId: '1',
        orderNumber: 'ORD-001',
        customerName: 'TechCorp Inc.',
        deliveryAddress: '123 Business Ave, Tech City',
        status: 'in_progress',
        startTime: new Date().toISOString(),
        estimatedArrival: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        currentLocation: {
          lat: 0,
          lng: 0
        },
        route: [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 1 }
        ],
        items: [
          {
            id: '1',
            name: 'Laptop Dell XPS 15',
            quantity: 5
          }
        ]
      };

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
      const { orderId, driverId, vehicleId, scheduledAt, notes } = req.body;

      // Get order and driver details for email
      const [order] = await db.select().from(schema.deliveryOrders).where(eq(schema.deliveryOrders.id, orderId)).limit(1);
      const [driver] = await db.select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).limit(1);

      // Update order status to dispatched
      await db.update(schema.deliveryOrders)
        .set({ status: 'dispatched', updatedAt: new Date() })
        .where(eq(schema.deliveryOrders.id, orderId));

      // Update driver status to on_duty
      await db.update(schema.drivers)
        .set({ status: 'on_duty' })
        .where(eq(schema.drivers.id, driverId));

      // Update vehicle status to in_use
      await db.update(schema.vehicles)
        .set({ status: 'in_use' })
        .where(eq(schema.vehicles.id, vehicleId));

      // Send delivery assignment notification to driver
      if (driver && order) {
        console.log('✅ New Delivery Assignment 🚛 - Sent successfully');
        await QueueService.addEmailJob({
          email: 'driver@example.com',
          title: 'New Delivery Assignment 🚛',
          name: driver.name,
          message: `You have been assigned a new delivery: Order ${order.orderNumber} to ${order.customerName}. Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          template: 'delivery_assignment'
        });
      }

      const dispatch = {
        id: Date.now(), // Mock ID
        orderId,
        driverId,
        vehicleId,
        status: 'active',
        scheduledAt: new Date(scheduledAt),
        notes,
        createdAt: new Date()
      };

      res.status(201).json({ 
        success: true,
        data: dispatch
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }

  static async updateDispatchStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, location, notes } = req.body;

      // Mock dispatch status update
      const dispatch = {
        id: Number(id),
        status,
        location,
        notes,
        updatedAt: new Date()
      };

      res.json(dispatch);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateDispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { scheduledAt, notes, estimatedArrival } = req.body;

      // Mock dispatch update
      const dispatch = {
        id: Number(id),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        notes,
        updatedAt: new Date()
      };

      res.json(dispatch);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}