import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

/** Loads a whole list (up to 500 rows) for client-side sorting, filtering and paging. */
export function useList<T = any>(key: string, url: string, params: Record<string, unknown> = {}, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery<T[]>({
    queryKey: ['list', key, params],
    queryFn: async () => {
      const res = await api.get(url, { params: { limit: 500, ...params } });
      const body = res.data;
      if (body?.success === false && res.status >= 400) throw new Error(body?.error?.message || 'Could not load data');
      const data = body?.data ?? body;
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    },
    enabled: options.enabled ?? true,
    refetchInterval: 60_000,
  });

  /** Update the cached rows directly (optimistic changes). */
  const setRows = (updater: (rows: T[]) => T[]) =>
    queryClient.setQueryData<T[]>(['list', key, params], (rows) => updater(rows || []));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['list', key] });

  return { rows: query.data || [], loading: query.isLoading, error: query.error, setRows, refresh };
}
