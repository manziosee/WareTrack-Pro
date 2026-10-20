import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';

export class PredictiveMaintenanceController {
  static async recordVehicleHealth(req: Request, res: Response) {
    try {
      const { vehicleId, odometerReading, fuelEfficiency, engineHours } = req.body;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const healthScore = Math.max(0, Math.min(100, 
        100 - (odometerReading / 1000) - (engineHours / 100) + (fuelEfficiency * 5)
      ));
      
      const predictedMaintenanceDate = new Date();
      predictedMaintenanceDate.setDate(predictedMaintenanceDate.getDate() + Math.floor(healthScore * 3));
      
      const maintenanceCostEstimate = (100 - healthScore) * 100;
      
      await prisma.$executeRaw`
        INSERT INTO vehicle_health (company_id, branch_id, vehicle_id, odometer_reading, fuel_efficiency, engine_hours, health_score, predicted_maintenance_date, maintenance_cost_estimate)
        SELECT ${tenant.companyId}, ${tenant.branchId}, v.id, ${odometerReading}, ${fuelEfficiency}, ${engineHours}, ${healthScore}, ${predictedMaintenanceDate}, ${maintenanceCostEstimate}
        FROM vehicles v WHERE v.id = ${vehicleId} AND v.company_id = ${tenant.companyId}
          AND (v.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR v.branch_id = ${tenant.branchId})
      `;
      
      res.json({ success: true, data: { healthScore, predictedMaintenanceDate, maintenanceCostEstimate } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getVehicleHealth(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const health = await prisma.$queryRaw`
        SELECT vh.*, v.plate_number, v.type
        FROM vehicle_health vh
        JOIN vehicles v ON vh.vehicle_id = v.id
        WHERE vh.vehicle_id = ${vehicleId} AND vh.company_id = ${tenant.companyId}
          AND (vh.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR vh.branch_id = ${tenant.branchId})
          AND v.company_id = ${tenant.companyId}
        ORDER BY vh.recorded_at DESC
        LIMIT 10
      `;
      
      res.json({ success: true, data: health });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getMaintenanceSchedule(req: Request, res: Response) {
    try {
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const schedule = await prisma.$queryRaw`
        SELECT v.id, v.plate_number, v.type, vh.health_score, 
               vh.predicted_maintenance_date, vh.maintenance_cost_estimate
        FROM vehicles v
        LEFT JOIN LATERAL (
          SELECT * FROM vehicle_health 
          WHERE vehicle_id = v.id AND company_id = ${tenant.companyId}
            AND (branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR branch_id = ${tenant.branchId})
          ORDER BY recorded_at DESC LIMIT 1
        ) vh ON true
        WHERE v.company_id = ${tenant.companyId}
          AND (v.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR v.branch_id = ${tenant.branchId})
          AND v.status != 'MAINTENANCE'
          AND vh.predicted_maintenance_date <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY vh.predicted_maintenance_date ASC
      `;
      
      res.json({ success: true, data: schedule });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getCostOptimization(req: Request, res: Response) {
    try {
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const analysis = await prisma.$queryRaw`
        SELECT 
          v.id, v.plate_number,
          COUNT(mr.id) as maintenance_count,
          SUM(mr.cost) as total_cost,
          AVG(vh.health_score) as avg_health_score,
          MAX(vh.maintenance_cost_estimate) as estimated_next_cost
        FROM vehicles v
        LEFT JOIN maintenance_records mr ON v.id = mr.vehicle_id AND mr.company_id = ${tenant.companyId}
          AND (mr.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR mr.branch_id = ${tenant.branchId})
        LEFT JOIN vehicle_health vh ON v.id = vh.vehicle_id AND vh.company_id = ${tenant.companyId}
          AND (vh.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR vh.branch_id = ${tenant.branchId})
        WHERE v.company_id = ${tenant.companyId}
          AND (v.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR v.branch_id = ${tenant.branchId})
          AND mr.completed_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY v.id, v.plate_number
        ORDER BY total_cost DESC
      `;
      
      res.json({ success: true, data: analysis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
