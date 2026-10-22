import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  companyId: number;
  branchId: number | null;
  /**
   * See every branch of the company (e.g. a customer looking at all their
   * orders). Without it, branchId null means "company-wide rows only".
   */
  allBranches?: boolean;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export const getTenantContext = () => tenantStorage.getStore();

export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
  return tenantStorage.run(context, callback);
}

/**
 * Run code outside any company (e.g. looking up memberships across companies).
 * Prisma queries are lazy and only run when awaited, so the callback is
 * awaited inside the tenant-free scope; returning the query unawaited would
 * otherwise run it back inside the caller's company.
 */
export function runWithoutTenant<T>(callback: () => T | Promise<T>): Promise<T> {
  return tenantStorage.exit(async () => await callback());
}

/** companyId/branchId of the current request, for creating rows in tables that require them. */
export function tenantFields() {
  const tenant = tenantStorage.getStore();
  if (!tenant) throw new Error('No company selected for this operation');
  return { companyId: tenant.companyId, branchId: tenant.branchId };
}
