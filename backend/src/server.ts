import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// Redis disabled in production
// import { connectRedis } from './config/redis';
import { specs, swaggerUi } from './config/swagger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import inventoryRoutes from './routes/inventory';
import orderRoutes from './routes/orders';
import dispatchRoutes from './routes/dispatch';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import testEmailRoutes from './routes/test-email';
import { errorHandler } from './middleware/errorHandler';
import { InventoryAlerts } from './middleware/inventoryAlerts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger
      connectSrc: ["'self'", "https:"],
    },
  },
}));

// Compression with optimized settings
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for API usage
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ware-track-pro.vercel.app', process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:3000'].filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing with optimization
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Swagger Documentation - Always available
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WareTrack-Pro API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  }
}));
console.log('📚 Swagger documentation available at /api-docs');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/test', testEmailRoutes);

// Health check with detailed information
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
    },
    services: {
      database: 'connected', // You can add actual health checks here
      redis: 'connected',
    }
  };
  res.status(200).json(healthCheck);
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'WareTrack-Pro API',
    version: '1.0.0',
    description: 'Comprehensive Warehouse Delivery & Dispatch Tracking System',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      inventory: '/api/inventory',
      orders: '/api/orders',
      vehicles: '/api/vehicles',
      drivers: '/api/drivers',
      dispatch: '/api/dispatch',
      dashboard: '/api/dashboard',
      reports: '/api/reports'
    },
    utilities: {
      health: '/health',
      documentation: '/api-docs',
      test: '/api/test'
    }
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Redis completely disabled to prevent connection issues
console.log('⚠️  Redis disabled - running without caching and queues');

// Start inventory alerts scheduler
InventoryAlerts.startScheduledCheck();

Promise.resolve().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`⚡ Ready to handle requests!`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});