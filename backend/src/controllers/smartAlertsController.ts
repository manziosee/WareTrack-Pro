import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class SmartAlertsController {
  static async getAlerts(req: Request, res: Response) {
    try {
      const { resolved = false } = req.query;
      
      const alerts = await prisma.$queryRaw`
        SELECT * FROM smart_alerts
        WHERE resolved = ${resolved}
          AND trigger_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
        ORDER BY trigger_date ASC, severity DESC
        LIMIT 50
      `;
      
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async checkMaintenanceAlerts(req: Request, res: Response) {
    try {
      const vehicles = await prisma.$queryRaw`
        SELECT v.id, v.plate_number, v.last_maintenance,
               mr.next_service_date, mr.next_service_odometer
        FROM vehicles v
        LEFT JOIN maintenance_records mr ON v.id = mr.vehicle_id
        WHERE v.status != 'MAINTENANCE'
          AND (mr.next_service_date <= CURRENT_DATE + INTERVAL '14 days'
               OR v.last_maintenance <= CURRENT_DATE - INTERVAL '90 days')
      `;
      
      for (const vehicle of vehicles as any[]) {
        await prisma.$executeRaw`
          INSERT INTO smart_alerts (alert_type, entity_type, entity_id, title, message, severity, trigger_date)
          VALUES (
            'MAINTENANCE_DUE',
            'vehicle',
            ${vehicle.id},
            'Vehicle Maintenance Due',
            'Vehicle ${vehicle.plate_number} requires maintenance',
            'WARNING',
            CURRENT_TIMESTAMP
          )
          ON CONFLICT DO NOTHING
        `;
      }
      
      res.json({ success: true, data: vehicles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async checkLicenseExpiry(req: Request, res: Response) {
    try {
      const drivers = await prisma.$queryRaw`
        SELECT id, name, license_number, license_expiry
        FROM drivers
        WHERE license_expiry <= CURRENT_DATE + INTERVAL '30 days'
          AND status != 'OFF_DUTY'
      `;
      
      for (const driver of drivers as any[]) {
        await prisma.$executeRaw`
          INSERT INTO smart_alerts (alert_type, entity_type, entity_id, title, message, severity, trigger_date)
          VALUES (
            'LICENSE_EXPIRY',
            'driver',
            ${driver.id},
            'Driver License Expiring',
            'License for ${driver.name} expires on ${driver.license_expiry}',
            'ERROR',
            ${driver.license_expiry}
          )
          ON CONFLICT DO NOTHING
        `;
      }
      
      res.json({ success: true, data: drivers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async checkOrderDeadlines(req: Request, res: Response) {
    try {
      const orders = await prisma.$queryRaw`
        SELECT id, order_number, scheduled_date, customer_name
        FROM delivery_orders
        WHERE status IN ('PENDING', 'DISPATCHED')
          AND scheduled_date <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
      `;
      
      for (const order of orders as any[]) {
        await prisma.$executeRaw`
          INSERT INTO smart_alerts (alert_type, entity_type, entity_id, title, message, severity, trigger_date)
          VALUES (
            'ORDER_DEADLINE',
            'order',
            ${order.id},
            'Order Deadline Approaching',
            'Order ${order.order_number} for ${order.customer_name} due soon',
            'WARNING',
            ${order.scheduled_date}
          )
          ON CONFLICT DO NOTHING
        `;
      }
      
      res.json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async resolveAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      
      await prisma.$executeRaw`
        UPDATE smart_alerts 
        SET resolved = true, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ${alertId}
      `;
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
