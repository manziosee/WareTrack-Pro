import api from './api';

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  },

  async getTrends() {
    const response = await api.get('/dashboard/trends');
    return response.data.data;
  }
};