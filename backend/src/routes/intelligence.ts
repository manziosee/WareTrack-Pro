import { Router } from 'express';
import { auth, authorizeRoles } from '../middleware/auth';
import { forecastDemand, driverScorecards, detectAnomalies } from '../services/intelligence';

/** Forecasts, scorecards and anomalies. Mounted at /api/intelligence. */
const router = Router();

router.get('/forecast', auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF'), async (req, res, next) => {
  try {
    const data = await forecastDemand({ itemId: req.query.itemId ? Number(req.query.itemId) : undefined, horizon: Number(req.query.horizon) || 30 });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/scorecards', auth, authorizeRoles('ADMIN', 'DISPATCH_OFFICER'), async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
    res.json({ success: true, data: await driverScorecards(days), days });
  } catch (error) {
    next(error);
  }
});

router.get('/anomalies', auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await detectAnomalies() });
  } catch (error) {
    next(error);
  }
});

export default router;
