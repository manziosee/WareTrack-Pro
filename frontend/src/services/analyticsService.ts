import api from './api';

export const analyticsService = {
  getInventoryTrends: async (days: number = 30) => {
    const response = await api.get(`/analytics/inventory-trends?days=${days}`);
    return response.data.data;
  },

  getCategoryDistribution: async () => {
    const response = await api.get('/analytics/category-distribution');
    return response.data.data;
  },

  getDriverPerformance: async (months: number = 6) => {
    const response = await api.get(`/analytics/driver-performance?months=${months}`);
    return response.data.data;
  },

  getFleetUtilization: async () => {
    const response = await api.get('/analytics/fleet-utilization');
    return response.data.data;
  },

  getDispatchEfficiency: async (days: number = 30) => {
    const response = await api.get(`/analytics/dispatch-efficiency?days=${days}`);
    return response.data.data;
  },

  getOrderTrends: async (months: number = 6) => {
    const response = await api.get(`/analytics/order-trends?months=${months}`);
    return response.data.data;
  },
};
