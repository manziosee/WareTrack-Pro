import { validateEnv } from './config/env';
import { server } from './app';
import { InventoryAlerts } from './middleware/inventoryAlerts';
import { prisma } from './lib/prisma';

// Fail fast on missing secrets instead of running with insecure defaults
validateEnv();

// Log stray async errors instead of letting one bad promise take the whole API down
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

const PORT = Number(process.env.PORT) || 8080;

// Start inventory alerts scheduler only in production
if (process.env.NODE_ENV === 'production') {
  InventoryAlerts.startScheduledCheck();
}

function start() {
  const httpServer = server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Health check: /health`);
    console.log(`📚 API Documentation: /api-docs`);
    console.log(`⚡ Ready to handle requests!`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    httpServer.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
    // Force exit if connections don't close in time
    setTimeout(() => process.exit(0), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
    start();
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.warn('⚠️  Starting server anyway; database calls will retry on demand');
    start();
  });
