import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';

export class ForecastingController {
  static async getInventoryForecast(req: Request, res: Response) {
    try {
      const { itemId, days = 30 } = req.query;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const forecasts = await prisma.$queryRaw`
        SELECT f.*, i.name,
          COALESCE((SELECT SUM(ws.quantity) FROM warehouse_stock ws
            JOIN warehouses w ON w.id = ws.warehouse_id
            WHERE ws.item_id = i.id AND w.company_id = ${tenant.companyId}
              AND (${tenant.branchId}::int IS NULL OR w.branch_id = ${tenant.branchId} OR w.branch_id IS NULL)), 0)::int AS current_stock
        FROM inventory_forecasts f
        JOIN inventory_items i ON f.item_id = i.id
        WHERE f.item_id = ${itemId} AND f.company_id = ${tenant.companyId}
          AND (f.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR f.branch_id = ${tenant.branchId})
          AND f.forecast_date >= CURRENT_DATE
          AND f.forecast_date <= CURRENT_DATE + INTERVAL '${days} days'
        ORDER BY f.forecast_date ASC
      `;
      
      res.json({ success: true, data: forecasts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async generateForecast(req: Request, res: Response) {
    try {
      const { itemId } = req.body;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const historicalData: any[] = await prisma.$queryRaw`
        SELECT 
          DATE(performed_at) as date,
          SUM(CASE WHEN action IN ('stock_out', 'order_allocation') THEN quantity ELSE 0 END) as demand
        FROM inventory_history
        WHERE item_id = ${itemId} AND company_id = ${tenant.companyId}
          AND (branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR branch_id = ${tenant.branchId})
          AND performed_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(performed_at)
        ORDER BY date ASC
      `;
      
      const avgDemand = historicalData.reduce((sum: number, d: any) => sum + Number(d.demand || 0), 0) / historicalData.length || 1;
      const demandVariance = historicalData.length
        ? historicalData.reduce((sum: number, d: any) => sum + (Number(d.demand || 0) - avgDemand) ** 2, 0) / historicalData.length
        : 0;
      const coefficientOfVariation = avgDemand > 0 ? Math.sqrt(demandVariance) / avgDemand : 0;
      const confidenceLevel = Math.max(50, Math.min(95,
        50 + Math.min(45, (historicalData.length / 90) * 45) - Math.min(25, coefficientOfVariation * 20),
      ));
      const forecasts = [];
      
      for (let i = 1; i <= 30; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        
        const seasonalFactor = 1 + (Math.sin(i / 7) * 0.2);
        const trendFactor = 1 + (i * 0.01);
        const predictedDemand = Math.round(avgDemand * seasonalFactor * trendFactor);
        
        forecasts.push({
          itemId,
          forecastDate: forecastDate.toISOString().split('T')[0],
          predictedDemand,
          confidenceLevel,
          seasonalFactor,
          trendFactor
        });
      }
      
      await prisma.$executeRaw`
        INSERT INTO inventory_forecasts (company_id, branch_id, item_id, forecast_date, predicted_demand, confidence_level, seasonal_factor, trend_factor)
        SELECT * FROM UNNEST(
          ${forecasts.map(() => tenant.companyId)}::int[],
          ${forecasts.map(() => tenant.branchId)}::int[],
          ${forecasts.map(f => f.itemId)}::int[],
          ${forecasts.map(f => f.forecastDate)}::date[],
          ${forecasts.map(f => f.predictedDemand)}::int[],
          ${forecasts.map(f => f.confidenceLevel)}::decimal[],
          ${forecasts.map(f => f.seasonalFactor)}::decimal[],
          ${forecasts.map(f => f.trendFactor)}::decimal[]
        )
        ON CONFLICT (item_id, forecast_date) DO UPDATE SET
          predicted_demand = EXCLUDED.predicted_demand,
          confidence_level = EXCLUDED.confidence_level
      `;
      
      res.json({ success: true, data: forecasts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getReorderSuggestions(req: Request, res: Response) {
    try {
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const suggestions = await prisma.$queryRaw`
        SELECT 
          i.id, i.name, i.code, COALESCE(stock.quantity, 0)::int as current_stock, i.min_quantity,
          COALESCE(SUM(f.predicted_demand), 0) as predicted_demand_30days,
          GREATEST(0, COALESCE(SUM(f.predicted_demand), 0) - COALESCE(stock.quantity, 0) + i.min_quantity) as suggested_order_qty
        FROM inventory_items i
        LEFT JOIN (
          SELECT ws.item_id, SUM(ws.quantity)::int AS quantity
          FROM warehouse_stock ws JOIN warehouses w ON w.id = ws.warehouse_id
          WHERE w.company_id = ${tenant.companyId}
            AND (${tenant.branchId}::int IS NULL OR w.branch_id = ${tenant.branchId} OR w.branch_id IS NULL)
          GROUP BY ws.item_id
        ) stock ON stock.item_id = i.id
        LEFT JOIN inventory_forecasts f ON i.id = f.item_id 
          AND f.forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND f.company_id = ${tenant.companyId}
          AND (f.branch_id IS NULL OR ${tenant.branchId}::int IS NULL OR f.branch_id = ${tenant.branchId})
        WHERE i.status = 'ACTIVE' AND i.company_id = ${tenant.companyId}
        GROUP BY i.id, stock.quantity
        HAVING COALESCE(stock.quantity, 0) < i.min_quantity
           OR COALESCE(SUM(f.predicted_demand), 0) > COALESCE(stock.quantity, 0)
        ORDER BY suggested_order_qty DESC
      `;
      
      res.json({ success: true, data: suggestions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
