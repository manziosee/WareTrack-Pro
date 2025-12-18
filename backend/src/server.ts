import { app } from './app';
import { InventoryAlerts } from './middleware/inventoryAlerts';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 5000;

console.log('📚 Swagger documentation available at /api-docs');

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

console.log('⚠️  Redis disabled - running without caching and queues');

// Start inventory alerts scheduler only in production
if (process.env.NODE_ENV === 'production') {
  InventoryAlerts.startScheduledCheck();
}

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