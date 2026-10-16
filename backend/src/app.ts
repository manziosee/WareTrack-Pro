import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import inventoryRoutes from './routes/inventory';
import ordersRoutes from './routes/orders';
import vehiclesRoutes from './routes/vehicles';
import driversRoutes from './routes/drivers';
import dispatchRoutes from './routes/dispatch';
import usersRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import passwordResetRoutes from './routes/passwordReset';
import testEmailRoutes from './routes/test-email';
import analyticsRoutes from './routes/analytics';
import featuresRoutes from './routes/features';
import insightsRoutes from './routes/insights';
import auditRoutes from './routes/audit';
import savedFilterRoutes from './routes/savedFilters';
import { auditTrail } from './middleware/audit';
import warehousingRoutes from './routes/warehousing';
import operationsRoutes from './routes/operations';
import commerceRoutes from './routes/commerce';
import intelligenceRoutes from './routes/intelligence';
import platformRoutes from './routes/platform';
import financeRoutes from './routes/finance';
import warehouseOpsRoutes from './routes/warehouseOps';
import intakeRoutes from './routes/intake';
import chatRoutes from './routes/chat';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { swaggerSpec, addUndocumentedRoutes } from './config/swagger';
import { getAllowedOrigins } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

const API_VERSION = '2.4.0';

const app = express();

// Render terminates TLS at its proxy; trust it so rate limiting sees real client IPs
app.set('trust proxy', 1);
app.disable('x-powered-by');
const server = http.createServer(app);

const allowedOrigins = getAllowedOrigins();

// Versioned alias: /api/v1/... behaves exactly like /api/...
app.use((req, _res, next) => {
  if (req.url === '/api/v1' || req.url.startsWith('/api/v1/')) req.url = req.url.replace(/^\/api\/v1/, '/api');
  next();
});

app.use(helmet({
  // Swagger UI needs inline scripts and styles
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (Postman, curl, health checks) which send no Origin
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// In production, never send internal error details (SQL, stack traces) to clients.
// Controllers still log the real error; only the response body is sanitized.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 500 && body && typeof body === 'object') {
        console.error(`[${req.method} ${req.originalUrl}] ${res.statusCode}:`, body?.error?.message || body?.message);
        return originalJson({
          success: false,
          error: {
            code: body?.error?.code || 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong. Please try again.'
          }
        });
      }
      return originalJson(body);
    };
    next();
  });
}

// Proof-of-delivery uploads (signature + photo) need a little more room
app.use('/api/my-deliveries', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// General API rate limit; auth endpoints have stricter limits of their own
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  // Dashboards poll every 30s, so leave generous headroom per user
  max: Number(process.env.API_RATE_LIMIT_PER_15_MIN) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again shortly.' }
  }
}));

app.get('/', (req, res) => {
  res.json({
    name: 'WareTrack-Pro API',
    version: API_VERSION,
    status: 'running',
    docs: '/api-docs',
    health: '/health',
    api: '/api'
  });
});

app.get('/health', async (req, res) => {
  let database = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  // Always 200 so Render doesn't restart the service over a brief database blip
  res.json({
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    version: API_VERSION,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'WareTrack-Pro API',
    version: API_VERSION,
    docs: '/api-docs',
    endpoints: [
      '/api/auth', '/api/dashboard', '/api/inventory', '/api/orders', '/api/vehicles',
      '/api/drivers', '/api/dispatch', '/api/users', '/api/notifications', '/api/reports',
      '/api/settings', '/api/password-reset', '/api/analytics', '/api/features', '/api/insights', '/api/audit', '/api/saved-filters', '/api/intelligence',
      '/api/warehouses', '/api/transfers', '/api/suppliers', '/api/purchase-orders', '/api/batches', '/api/returns',
      '/api/routes', '/api/dispatch-suggestions', '/api/auto-dispatch', '/api/my-deliveries', '/api/live-map',
      '/api/payments', '/api/invoices', '/api/webhooks', '/api/report-builder', '/api/saved-reports', '/api/auth/2fa',
      '/api/public/track/:orderNumber', '/api/accounts', '/api/cash', '/api/expenses', '/api/accounting/export',
      '/api/stock-counts', '/api/packing', '/api/orders/import', '/api/push', '/api/api-keys', '/api/intake/orders',
      '/api/public/catalog', '/api/public/orders'
    ]
  });
});

// List every mounted route in Swagger, including ones without hand-written docs
addUndocumentedRoutes(swaggerSpec, [
  ['/api/auth', 'Authentication', authRoutes],
  ['/api/password-reset', 'Password Reset', passwordResetRoutes],
  ['/api/dashboard', 'Dashboard', dashboardRoutes],
  ['/api/users', 'Users', usersRoutes],
  ['/api/inventory', 'Inventory', inventoryRoutes],
  ['/api/orders', 'Orders', ordersRoutes],
  ['/api/vehicles', 'Vehicles', vehiclesRoutes],
  ['/api/drivers', 'Drivers', driversRoutes],
  ['/api/dispatch', 'Dispatch', dispatchRoutes],
  ['/api/notifications', 'Notifications', notificationRoutes],
  ['/api/reports', 'Reports', reportsRoutes],
  ['/api/analytics', 'Analytics', analyticsRoutes],
  ['/api/settings', 'Settings', settingsRoutes],
  ['/api/features', 'Advanced Features', featuresRoutes],
  ['/api/insights', 'Insights', insightsRoutes],
  ['/api/audit', 'Audit Log', auditRoutes],
  ['/api/saved-filters', 'Saved Filters', savedFilterRoutes],
  ['/api/intelligence', 'Intelligence', intelligenceRoutes],
  ['/api/chat', 'Chat', chatRoutes],
  ['/api', 'Warehousing & Purchasing', warehousingRoutes],
  ['/api', 'Operations', operationsRoutes],
  ['/api', 'Payments & Invoices', commerceRoutes],
  ['/api', 'Platform', platformRoutes],
  ['/api', 'Customer Accounts, Cash & Expenses', financeRoutes],
  ['/api', 'Stock Counts, Packing & Import', warehouseOpsRoutes],
  ['/api', 'Push, API Keys & Online Ordering', intakeRoutes],
] as any);

app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Record every successful write in the audit log
app.use('/api', auditTrail);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'WareTrack-Pro API Docs',
  swaggerOptions: { persistAuthorization: true }
}));
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/password-reset', passwordResetRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test-email', testEmailRoutes);
}
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', warehousingRoutes);
app.use('/api', operationsRoutes);
app.use('/api', commerceRoutes);
app.use('/api', platformRoutes);
app.use('/api', financeRoutes);
app.use('/api', warehouseOpsRoutes);
app.use('/api', intakeRoutes);

// Unknown routes return JSON instead of Express's HTML page
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
  });
});

app.use(errorHandler);

export { app, server };
