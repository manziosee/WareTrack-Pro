import api from './api';

export const reportsService = {
  async getInventoryReport(params?: { startDate?: string; endDate?: string; category?: string }) {
    const response = await api.get('/reports/inventory', { params });
    return response.data;
  },

  async getOrdersReport(params?: { startDate?: string; endDate?: string; status?: string }) {
    const response = await api.get('/reports/orders', { params });
    return response.data;
  },

  async getPerformanceReport(params?: { startDate?: string; endDate?: string; driverId?: number }) {
    const response = await api.get('/reports/performance', { params });
    return response.data;
  }
};