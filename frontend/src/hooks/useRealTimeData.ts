import { useState, useEffect, useCallback } from 'react';

export function useRealTimeData<T>(
  fetchFunction: () => Promise<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err: any) {
      setError('Service temporarily unavailable');
      console.warn('Data fetch failed, using cached data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
    // No automatic intervals - only manual refresh
  }, [fetchData]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}