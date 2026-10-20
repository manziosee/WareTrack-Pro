import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  companyId: number;
  branchId: number | null;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export const getTenantContext = () => tenantStorage.getStore();

export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
  return tenantStorage.run(context, callback);
}

export function runWithoutTenant<T>(callback: () => T): T {
  return tenantStorage.exit(callback);
}
