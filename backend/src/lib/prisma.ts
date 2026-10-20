import { PrismaClient } from '@prisma/client'
import { getTenantContext } from './tenantContext'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Query logging is noisy and can leak data into logs, so keep it to development
  log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error']
})

// Every authenticated Prisma request is constrained to one company. Operational
// records are additionally constrained to the selected branch; shared catalogs
// remain company-wide. Tenant IDs are stamped onto both direct and nested writes.
const branchScopedModels = new Set([
  'DeliveryOrder', 'OrderItem', 'StockReservation', 'Dispatch', 'MaintenanceRecord',
  'InventoryHistory', 'Notification', 'ChatMessage', 'DriverAchievement', 'InventoryForecast',
  'SmartAlert', 'CustomerRating', 'VehicleHealth', 'BarcodeLog', 'Warehouse', 'WarehouseStock',
  'StockTransfer', 'PurchaseOrder', 'PurchaseOrderItem', 'InventoryBatch', 'ReturnRequest',
  'Payment', 'Invoice', 'AuditLog', 'SavedFilter', 'SavedReport', 'Driver', 'Vehicle', 'DeliveryProof',
  'CashHandover', 'Expense', 'StockCount', 'StockCountLine', 'ApiKey', 'PushSubscription', 'FeedbackReport', 'UsageEvent',
]);

const companyScopedModels = new Set([
  'InventoryItem', 'Vehicle', 'Driver', 'DeliveryOrder', 'OrderItem', 'StockReservation',
  'Dispatch', 'MaintenanceRecord', 'InventoryHistory', 'NotificationPreferences', 'SystemConfiguration',
  'ReportSettings', 'Notification', 'DeliveryProof', 'ChatMessage', 'DriverAchievement',
  'DriverLeaderboard', 'InventoryForecast', 'SmartAlert', 'Customer', 'CustomerRating', 'VehicleHealth',
  'UserPreferences', 'BarcodeLog', 'Warehouse', 'WarehouseStock', 'StockTransfer', 'Supplier',
  'PurchaseOrder', 'PurchaseOrderItem', 'InventoryBatch', 'ReturnRequest', 'Payment', 'Invoice',
  'AuditLog', 'OtpCode', 'Webhook', 'SavedFilter', 'SavedReport', 'InventoryCategory',
  'CustomerAccount', 'CashHandover', 'Expense', 'ItemPackaging', 'StockCount', 'StockCountLine',
  'PushSubscription', 'ApiKey', 'AppSetting', 'Branch', 'CompanyMembership', 'RolePermission', 'FeedbackReport', 'UsageEvent',
]);

function scopedWhere(where: any, model: string, companyId: number, branchId: number | null) {
  const next = { ...(where || {}), companyId };
  if (branchScopedModels.has(model)) {
    const priorAnd = next.AND === undefined ? [] : Array.isArray(next.AND) ? next.AND : [next.AND];
    next.AND = [...priorAnd, branchId === null ? { branchId: null } : { OR: [{ branchId: null }, { branchId }] }];
  }
  return next;
}

function stampTenantData(value: any, model: string, companyId: number, branchId: number | null): any {
  if (Array.isArray(value)) return value.map((entry) => stampTenantData(entry, model, companyId, branchId));
  if (!value || typeof value !== 'object') return value;
  const data = { ...value, companyId };
  if (branchId !== null && branchScopedModels.has(model)) data.branchId = branchId;
  for (const key of Object.keys(data)) {
    const operation = data[key];
    if (!operation || typeof operation !== 'object') continue;
    if (key === 'create') data[key] = stampTenantData(operation, model, companyId, branchId);
    else if (key === 'createMany') data[key] = { ...operation, data: stampTenantData(operation.data, model, companyId, branchId) };
    else if (key === 'upsert') data[key] = {
      ...operation,
      create: stampTenantData(operation.create, model, companyId, branchId),
      update: stampTenantData(operation.update, model, companyId, branchId),
    };
    else if ('create' in operation || 'createMany' in operation || 'upsert' in operation) {
      data[key] = {
        ...operation,
        ...(operation.create !== undefined ? { create: stampTenantData(operation.create, model, companyId, branchId) } : {}),
        ...(operation.createMany !== undefined ? { createMany: { ...operation.createMany, data: stampTenantData(operation.createMany.data, model, companyId, branchId) } } : {}),
        ...(operation.upsert !== undefined ? { upsert: Array.isArray(operation.upsert) ? operation.upsert.map((u: any) => ({ ...u, create: stampTenantData(u.create, model, companyId, branchId), update: stampTenantData(u.update, model, companyId, branchId) })) : { ...operation.upsert, create: stampTenantData(operation.upsert.create, model, companyId, branchId), update: stampTenantData(operation.upsert.update, model, companyId, branchId) } } : {}),
      };
    }
  }
  return data;
}

prisma.$use(async (params, next) => {
  const tenant = getTenantContext();
  const model = params.model;
  if (!tenant || !model || !companyScopedModels.has(model)) return next(params);

  const args: any = params.args || {};
  if ('where' in args && args.where) args.where = scopedWhere(args.where, model, tenant.companyId, tenant.branchId);
  if (params.action === 'create') args.data = stampTenantData(args.data, model, tenant.companyId, tenant.branchId);
  if (params.action === 'createMany') args.data = stampTenantData(args.data, model, tenant.companyId, tenant.branchId);
  if (params.action === 'update' || params.action === 'updateMany') args.data = stampTenantData(args.data, model, tenant.companyId, tenant.branchId);
  if (params.action === 'upsert') {
    args.create = stampTenantData(args.create, model, tenant.companyId, tenant.branchId);
    args.update = stampTenantData(args.update, model, tenant.companyId, tenant.branchId);
  }
  params.args = args;
  return next(params);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
