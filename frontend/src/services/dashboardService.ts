import api from './api';

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  },

  async getTrends(period = '7') {
    const response = await api.get(`/dashboard/trends?period=${period}`);
    return response.data.data;
  },

  async getInventoryByCategory() {
    const response = await api.get('/dashboard/inventory-by-category');
    return response.data.data;
  },

  async getRecentOrders(limit = 10) {
    const response = await api.get(`/dashboard/recent-orders?limit=${limit}`);
    return response.data.data;
  },

  async getActivity() {
    const response = await api.get('/dashboard/activity');
    return response.data.data;
  },

  async getNotifications() {
    const response = await api.get('/dashboard/notifications');
    return response.data.data;
  }
};