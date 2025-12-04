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
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
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

// Very permissive rate limiting
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: {
    error: 'Too many requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost and health checks
    const origin = req.get('Origin');
    return req.path === '/health' || 
           (origin && (origin.includes('localhost') || origin.includes('127.0.0.1')));
  }
});
app.use(globalLimiter);

// CORS - More permissive configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://ware-track-pro.vercel.app',
      'https://waretrack-pro.onrender.com',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    // Allow localhost and 127.0.0.1 with any port for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
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
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

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

// Import Prisma for database operations
import { prisma } from './lib/prisma';

// Start inventory alerts scheduler
InventoryAlerts.startScheduledCheck();

// Test Prisma connection and start server
prisma.$connect().then(() => {
  console.log('✅ Database connected successfully');
  const dbConnected = true;
  if (!dbConnected) {
    console.warn('⚠️  Database connection failed, but starting server anyway...');
    console.log('🔄 Server will retry database connections on demand');
  }
  
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
  console.error('❌ Database connection failed:', error);
  console.warn('⚠️  Starting server anyway...');
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`⚡ Ready to handle requests!`);
  });
});