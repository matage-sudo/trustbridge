import { AsyncLocalStorage } from 'node:async_hooks';
export interface TenantContextData {
  tenantId: string;
  userId: string;
  role: string;
  correlationId: string;
}
export const tenantStore = new AsyncLocalStorage<TenantContextData>();
export function currentTenant(): TenantContextData {
  const ctx = tenantStore.getStore();
  if (!ctx) throw new Error('Tenant context is not available');
  return ctx;
}