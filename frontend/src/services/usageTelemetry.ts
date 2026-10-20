export type UsageEvent = 'PAGE_VIEW' | 'API_ERROR' | 'ACTION';
const staticSegments = new Set(['dashboard', 'orders', 'board', 'edit', 'dispatch', 'map', 'calendar', 'tracking', 'returns', 'inventory', 'scanner', 'warehouses', 'purchasing', 'forecasting', 'vehicles', 'drivers', 'scorecards', 'reports', 'builder', 'payments', 'accounts', 'cash', 'expenses', 'accounting', 'packing', 'stock-counts', 'messages', 'notifications', 'settings', 'profile', 'feedback', 'usage-analytics', 'audit', 'features', 'customer', 'me', 'orders', 'rate-driver', 'reorder', 'proof-of-delivery', 'analytics', 'tenancy', 'usage-events', 'auth', 'users', 'branches', 'companies', 'transfers', 'suppliers', 'purchase-orders', 'batches', 'routes', 'live-map', 'my-deliveries', 'public', 'track', 'catalog', 'preferences', 'forecasting', 'smart-alerts']);

function normalizeRoute(route: string) {
  return route.split('?')[0].split('/').map((part) => !part ? '' : staticSegments.has(part.toLowerCase()) ? part.toLowerCase() : ':id').join('/').slice(0, 120);
}

/** Send anonymous-by-default workflow telemetry; never include form bodies or customer data. */
export function trackUsage(event: UsageEvent, route: string, details?: { method?: string; status?: number }) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const base = import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api';
  const companyId = localStorage.getItem('waretrack-company-id');
  const branchId = localStorage.getItem('waretrack-branch-id');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  if (companyId) headers['X-Company-Id'] = companyId;
  if (branchId) headers['X-Branch-Id'] = branchId;
  void fetch(`${base}/usage-events`, {
    method: 'POST', headers,
    body: JSON.stringify({ event, route: normalizeRoute(route), details }),
    keepalive: true,
  }).catch(() => undefined);
}
