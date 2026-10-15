import { useQuery } from '@tanstack/react-query';
import api from './api';

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

export const insightsService = {
  async getDashboard(fresh = false) {
    const response = await api.get('/insights/dashboard', { params: fresh ? { fresh: 1, t: Date.now() } : { t: Math.floor(Date.now() / 30000) } });
    if (!response.data?.success) throw new Error(response.data?.error?.message || 'Could not load the dashboard');
    return response.data.data;
  },

  async getLayout(): Promise<DashboardLayout | null> {
    const response = await api.get('/insights/dashboard/layout', { params: { t: Date.now() } });
    return response.data?.data ?? null;
  },

  async saveLayout(layout: DashboardLayout) {
    const response = await api.put('/insights/dashboard/layout', layout);
    return response.data?.data;
  },
};

/** Role dashboard data, refreshed every minute in the background. */
export function useDashboardData<T = any>() {
  return useQuery<T>({
    queryKey: ['insights', 'dashboard'],
    queryFn: () => insightsService.getDashboard(),
    refetchInterval: 60_000,
    staleTime: 25_000,
  });
}
