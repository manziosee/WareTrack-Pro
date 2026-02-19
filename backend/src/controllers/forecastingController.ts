import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ForecastingController {
  static async getInventoryForecast(req: Request, res: Response) {
    try {
      const { itemId, days = 30 } = req.query;
      
      const forecasts = await prisma.$queryRaw`
        SELECT f.*, i.name, i.quantity as current_stock
        FROM inventory_forecasts f
        JOIN inventory_items i ON f.item_id = i.id
        WHERE f.item_id = ${itemId}
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
      
      const historicalData: any[] = await prisma.$queryRaw`
        SELECT 
          DATE(performed_at) as date,
          SUM(CASE WHEN action = 'stock_out' THEN quantity ELSE 0 END) as demand
        FROM inventory_history
        WHERE item_id = ${itemId}
          AND performed_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(performed_at)
        ORDER BY date ASC
      `;
      
      const avgDemand = historicalData.reduce((sum: number, d: any) => sum + d.demand, 0) / historicalData.length || 1;
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
          confidenceLevel: 75 + Math.random() * 15,
          seasonalFactor,
          trendFactor
        });
      }
      
      await prisma.$executeRaw`
        INSERT INTO inventory_forecasts (item_id, forecast_date, predicted_demand, confidence_level, seasonal_factor, trend_factor)
        SELECT * FROM UNNEST(
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
      const suggestions = await prisma.$queryRaw`
        SELECT 
          i.id, i.name, i.code, i.quantity as current_stock, i.min_quantity,
          COALESCE(SUM(f.predicted_demand), 0) as predicted_demand_30days,
          GREATEST(0, COALESCE(SUM(f.predicted_demand), 0) - i.quantity + i.min_quantity) as suggested_order_qty
        FROM inventory_items i
        LEFT JOIN inventory_forecasts f ON i.id = f.item_id 
          AND f.forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        WHERE i.status = 'ACTIVE'
        GROUP BY i.id
        HAVING i.quantity < i.min_quantity 
           OR COALESCE(SUM(f.predicted_demand), 0) > i.quantity
        ORDER BY suggested_order_qty DESC
      `;
      
      res.json({ success: true, data: suggestions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
