import api from './api';

export type SummaryPeriod = 'day' | 'week' | 'month';

export const reportsService = {
  /** Management summary PDF for the last finished day, week or month */
  async downloadSummary(period: SummaryPeriod) {
    const response = await api.get('/reports/summary', { params: { period, format: 'pdf' }, responseType: 'blob' });
    const name = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '')?.[1] || `waretrack-${period}-summary.pdf`;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  },

  async emailSummary(period: SummaryPeriod) {
    const response = await api.post('/reports/summary/send', { period });
    return response.data as { success: boolean; message: string };
  },

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