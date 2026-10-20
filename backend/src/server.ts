import { validateEnv } from './config/env';
import { initMonitoring, captureError } from './config/monitoring';
import { server } from './app';
import { InventoryAlerts } from './middleware/inventoryAlerts';
import { prisma } from './lib/prisma';
import { initRealtime } from './services/realtime';
import { startJobs } from './services/jobs';

// Fail fast on missing secrets instead of running with insecure defaults
validateEnv();
initMonitoring();

// Log stray async errors instead of letting one bad promise take the whole API down
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  captureError(reason);
});

const PORT = Number(process.env.PORT) || 8080;

// Live updates (notifications, chat, driver locations)
initRealtime(server);

// Scheduled work: inventory alerts, SLA risk, anomalies, restock, reports
if (process.env.NODE_ENV === 'production' || process.env.RUN_JOBS === 'true') {
  InventoryAlerts.startScheduledCheck();
  startJobs();
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
    // Additive, backward-compatible delivery scan detail storage. Keep this
    // guard while deployments use the existing Docker startup (which does not
    // automatically run Prisma migrations).
    return prisma.$executeRaw`ALTER TABLE "delivery_proofs" ADD COLUMN IF NOT EXISTS "delivered_items" JSONB`
      .then(() => prisma.$executeRaw`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "legacy_barcodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`)
      .then(() => prisma.$executeRaw`UPDATE "inventory_items" SET "legacy_barcodes" = CASE WHEN "barcode" IS NOT NULL AND "barcode" <> '' AND "barcode" IS DISTINCT FROM ('WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0')) THEN array_append("legacy_barcodes", "barcode") ELSE "legacy_barcodes" END, "barcode" = 'WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0') WHERE "barcode" IS DISTINCT FROM ('WTP-' || COALESCE(NULLIF(LEFT(REGEXP_REPLACE(UPPER(COALESCE("category", '')), '[^A-Z0-9]', '', 'g'), 8), ''), 'GENERAL') || '-' || LPAD("id"::text, 8, '0'))`)
      .then(() => prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_company_id_barcode_key" ON "inventory_items"("company_id", "barcode")`)
      .then(() => start())
      .catch((error) => {
        console.error('❌ Could not prepare delivery scan storage:', error);
        start();
      });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.warn('⚠️  Starting server anyway; database calls will retry on demand');
    start();
  });
