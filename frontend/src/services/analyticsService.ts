import api from './api';

export const analyticsService = {
  getInventoryTrends: async (days: number = 30) => {
    try {
      const response = await api.get(`/analytics/inventory-trends?days=${days}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch inventory trends:', error);
      return [];
    }
  },

  getCategoryDistribution: async () => {
    try {
      const response = await api.get('/analytics/category-distribution');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch category distribution:', error);
      return [];
    }
  },

  getDriverPerformance: async (months: number = 6) => {
    try {
      const response = await api.get(`/analytics/driver-performance?months=${months}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch driver performance:', error);
      return [];
    }
  },

  getDriverPerformanceById: async (driverId: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly') => {
    try {
      const response = await api.get(`/analytics/driver-performance/${driverId}?period=${period}`);
      return response.data.data || response.data || null;
    } catch (error) {
      console.error('Failed to fetch driver performance by ID:', error);
      return null;
    }
  },

  getFleetUtilization: async () => {
    try {
      const response = await api.get('/analytics/fleet-utilization');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch fleet utilization:', error);
      return [];
    }
  },

  getDispatchEfficiency: async (days: number = 30) => {
    try {
      const response = await api.get(`/analytics/dispatch-efficiency?days=${days}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch dispatch efficiency:', error);
      return [];
    }
  },

  getOrderTrends: async (months: number = 6) => {
    try {
      const response = await api.get(`/analytics/order-trends?months=${months}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch order trends:', error);
      return [];
    }
  },
};
