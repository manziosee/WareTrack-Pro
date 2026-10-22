import { Prisma, PrismaClient } from '@prisma/client'
import { getTenantContext } from './tenantContext'

/**
 * Multi-company data separation.
 *
 * Inside a request (or job) that runs with a tenant context, every query on a
 * table that has a `companyId` column is limited to that company, and
 * operational tables are also limited to the selected branch. This happens in
 * a Prisma client extension, so it covers queries with and without `where`,
 * counts, aggregates, updates, deletes and nested writes.
 *
 * Which tables are scoped is read from the schema itself, so a new table with a
 * `companyId` column is protected automatically. Tables that are deliberately
 * shared across companies must be listed in SHARED_MODELS.
 */

/** Tables with a companyId column that are intentionally not filtered by company. */
export const SHARED_MODELS = new Set<string>([
  // Users are global identities; access is decided by CompanyMembership
  'User',
  // Settings and devices that belong to a person (unique per user), not to a company
  'UserPreferences', 'NotificationPreferences', 'ReportSettings', 'SystemConfiguration', 'PushSubscription',
  // Sign-in codes are checked before a company is chosen
  'OtpCode',
]);

/**
 * Operational tables that are also limited to the selected branch. Catalogs
 * (items, categories, suppliers, accounts…) stay company-wide.
 */
export const BRANCH_SCOPED_MODELS = new Set<string>([
  'DeliveryOrder', 'OrderItem', 'StockReservation', 'Dispatch', 'MaintenanceRecord',
  'InventoryHistory', 'Notification', 'ChatMessage', 'DriverAchievement', 'InventoryForecast',
  'SmartAlert', 'CustomerRating', 'VehicleHealth', 'BarcodeLog', 'Warehouse', 'WarehouseStock',
  'StockTransfer', 'PurchaseOrder', 'PurchaseOrderItem', 'InventoryBatch', 'ReturnRequest',
  'Payment', 'Invoice', 'AuditLog', 'SavedFilter', 'SavedReport', 'Driver', 'Vehicle', 'DeliveryProof',
  'CashHandover', 'Expense', 'StockCount', 'StockCountLine', 'ApiKey', 'PushSubscription', 'FeedbackReport', 'UsageEvent',
]);

const models = Prisma.dmmf.datamodel.models;
const fieldsOf = (model: string) => models.find((m) => m.name === model)?.fields || [];

/** Every table with a companyId column, except the shared ones. */
export const COMPANY_SCOPED_MODELS = new Set(
  models.filter((m) => m.fields.some((f) => f.name === 'companyId') && !SHARED_MODELS.has(m.name)).map((m) => m.name)
);

/** relation field → target model, per model (for stamping nested writes correctly). */
const RELATIONS = new Map(
  models.map((m) => [m.name, new Map(m.fields.filter((f) => f.kind === 'object').map((f) => [f.name, f.type]))])
);

/** SQL table names of scoped models (for checking raw queries). */
const SCOPED_TABLES = new Set(
  models.filter((m) => COMPANY_SCOPED_MODELS.has(m.name)).map((m) => (m.dbName || m.name).toLowerCase())
);

const hasField = (model: string, field: string) => fieldsOf(model).some((f) => f.name === field);

function scopeFilter(model: string, companyId: number, branchId: number | null) {
  const filter: any[] = [{ companyId }];
  if (BRANCH_SCOPED_MODELS.has(model)) {
    filter.push(branchId === null ? { branchId: null } : { OR: [{ branchId: null }, { branchId }] });
  }
  return filter;
}

/** Add the company (and branch) condition to a where clause, keeping unique fields at the top level. */
function scopedWhere(where: any, model: string, companyId: number, branchId: number | null) {
  const next = { ...(where || {}) };
  const prior = next.AND === undefined ? [] : Array.isArray(next.AND) ? next.AND : [next.AND];
  next.AND = [...prior, ...scopeFilter(model, companyId, branchId)];
  return next;
}

/** Stamp companyId/branchId on created rows, following relations to their real target models. */
function stamp(data: any, model: string, companyId: number, branchId: number | null, creating: boolean): any {
  if (Array.isArray(data)) return data.map((d) => stamp(d, model, companyId, branchId, creating));
  if (!data || typeof data !== 'object') return data;
  const next: any = { ...data };
  if (creating && COMPANY_SCOPED_MODELS.has(model)) {
    // A relation to the company may be given instead of the scalar id
    if (!('company' in next)) next.companyId = companyId;
    if (branchId !== null && BRANCH_SCOPED_MODELS.has(model) && hasField(model, 'branchId') && !('branch' in next) && next.branchId === undefined) {
      next.branchId = branchId;
    }
  }
  const relations = RELATIONS.get(model);
  if (!relations) return next;
  for (const [field, target] of relations) {
    const op = next[field];
    if (!op || typeof op !== 'object') continue;
    const nested: any = { ...op };
    if (nested.create !== undefined) nested.create = stamp(nested.create, target, companyId, branchId, true);
    if (nested.createMany !== undefined) nested.createMany = { ...nested.createMany, data: stamp(nested.createMany.data, target, companyId, branchId, true) };
    if (nested.connectOrCreate !== undefined) {
      const list = Array.isArray(nested.connectOrCreate) ? nested.connectOrCreate : [nested.connectOrCreate];
      const mapped = list.map((c: any) => ({ ...c, create: stamp(c.create, target, companyId, branchId, true) }));
      nested.connectOrCreate = Array.isArray(nested.connectOrCreate) ? mapped : mapped[0];
    }
    if (nested.upsert !== undefined) {
      const list = Array.isArray(nested.upsert) ? nested.upsert : [nested.upsert];
      const mapped = list.map((u: any) => ({ ...u, create: stamp(u.create, target, companyId, branchId, true), update: stamp(u.update, target, companyId, branchId, false) }));
      nested.upsert = Array.isArray(nested.upsert) ? mapped : mapped[0];
    }
    next[field] = nested;
  }
  return next;
}

const READ_OR_FILTER_OPS = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy',
  'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
]);

/** Raw SQL bypasses the filter: inside a company context it must mention company_id itself. */
function checkRawSql(sql: string) {
  const tenant = getTenantContext();
  if (!tenant) return;
  const text = sql.toLowerCase();
  if (/\bcompany_id\b/.test(text)) return;
  const tables = [...text.matchAll(/\b(?:from|join|into|update)\s+"?([a-z_][a-z0-9_]*)"?/g)].map((m) => m[1]);
  const scoped = tables.filter((t) => SCOPED_TABLES.has(t));
  if (!scoped.length) return;
  const message = `Raw SQL on ${scoped.join(', ')} must filter by company_id when run for a company`;
  if (process.env.NODE_ENV === 'production') console.error(`[tenant-guard] ${message}`);
  else throw new Error(message);
}

/**
 * Without a company context, a created row would silently fall into the
 * column's default company. Require an explicit company instead.
 */
function checkUnscopedCreate(model: string, operation: string, args: any) {
  const rows = operation === 'create' ? [args?.data] : operation === 'createMany' || operation === 'createManyAndReturn' ? [].concat(args?.data || []) : operation === 'upsert' ? [args?.create] : [];
  const missing = rows.some((row: any) => row && row.companyId === undefined && !row.company);
  if (!missing) return;
  const message = `Creating ${model} without a company: run it inside a company context or pass companyId`;
  if (process.env.NODE_ENV === 'production') console.error(`[tenant-guard] ${message}`);
  else throw new Error(message);
}

const sqlText = (args: any) => (Array.isArray(args?.strings) ? args.strings.join('?') : typeof args?.sql === 'string' ? args.sql : typeof args?.[0] === 'string' ? args[0] : '');

function createClient() {
  const base = new PrismaClient({
    // Query logging is noisy and can leak data into logs, so keep it to development
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : process.env.PRISMA_LOG_QUERIES ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
  return base.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenant = getTenantContext();
          if (!model || !COMPANY_SCOPED_MODELS.has(model)) return query(args);
          if (!tenant) {
            checkUnscopedCreate(model, operation, args);
            return query(args);
          }
          const { companyId, branchId } = tenant;
          const next: any = { ...args };
          if (READ_OR_FILTER_OPS.has(operation)) next.where = scopedWhere(next.where, model, companyId, branchId);
          if (operation === 'create') next.data = stamp(next.data, model, companyId, branchId, true);
          if (operation === 'createMany' || operation === 'createManyAndReturn') next.data = stamp(next.data, model, companyId, branchId, true);
          if (operation === 'update' || operation === 'updateMany') next.data = stamp(next.data, model, companyId, branchId, false);
          if (operation === 'upsert') {
            next.create = stamp(next.create, model, companyId, branchId, true);
            next.update = stamp(next.update, model, companyId, branchId, false);
          }
          return query(next);
        },
      },
      async $queryRaw({ args, query }) { checkRawSql(sqlText(args)); return query(args); },
      async $executeRaw({ args, query }) { checkRawSql(sqlText(args)); return query(args); },
      async $queryRawUnsafe({ args, query }) { checkRawSql(sqlText(args)); return query(args); },
      async $executeRawUnsafe({ args, query }) { checkRawSql(sqlText(args)); return query(args); },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// The extension only rewrites query arguments, never result shapes, so the
// client keeps the standard PrismaClient type (and Prisma.TransactionClient works).
export const prisma: PrismaClient = globalForPrisma.prisma ?? (createClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
