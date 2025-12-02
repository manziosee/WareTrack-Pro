import api from './api';

export const reportsService = {
  async getAnalytics(params?: { startDate?: string; endDate?: string }) {
    const response = await api.get('/reports/analytics', { params });
    return response.data;
  },

  async getInventoryReport(params?: { startDate?: string; endDate?: string; category?: string }) {
    const response = await api.get('/reports/inventory', { params });
    return response.data;
  },

  async getSalesReport(params?: { startDate?: string; endDate?: string; customerId?: number }) {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  async getVehiclesReport(params?: { startDate?: string; endDate?: string }) {
    const response = await api.get('/reports/vehicles', { params });
    return response.data;
  },

  async getDriversReport(params?: { startDate?: string; endDate?: string }) {
    const response = await api.get('/reports/drivers', { params });
    return response.data;
  },

  async exportReport(data: { reportType: string; format: string; filters?: any }) {
    const response = await api.post('/reports/export', data);
    return response.data;
  }
};