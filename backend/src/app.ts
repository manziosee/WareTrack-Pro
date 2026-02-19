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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
app.use('/api/test-email', testEmailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featuresRoutes);

export { app, server };
