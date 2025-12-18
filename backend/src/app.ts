import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

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

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

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

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => {
    const origin = req.get('Origin');
    return req.path === '/health' || 
           (origin && (origin.includes('localhost') || origin.includes('127.0.0.1')));
  }
});
app.use(globalLimiter);

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://ware-track-pro.vercel.app',
      'https://waretrack-pro.onrender.com',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

app.set('trust proxy', 1);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WareTrack-Pro API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  }
}));

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

// Health check
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
      database: 'connected',
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
    health: '/health'
  });
});

// Error handling
app.use(errorHandler);

export { app };