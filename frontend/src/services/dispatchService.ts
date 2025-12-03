import api from './api';

export interface Dispatch {
  id: number;
  orderId: number;
  driverId: number;
  vehicleId: number;
  status: string;
  startTime: string;
  estimatedArrival?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface CreateDispatch {
  orderId: number;
  driverId: number;
  vehicleId: number;
  estimatedArrival?: string;
}

export const dispatchService = {
  async getDispatches(params?: { page?: number; limit?: number; status?: string }) {
    const response = await api.get('/dispatch', { params });
    return response.data;
  },

  async createDispatch(data: CreateDispatch) {
    const response = await api.post('/dispatch', data);
    return response.data;
  },

  async updateDispatch(id: number, data: Partial<CreateDispatch>) {
    const response = await api.put(`/dispatch/${id}`, data);
    return response.data;
  },

  async deleteDispatch(id: number) {
    const response = await api.delete(`/dispatch/${id}`);
    return response.data;
  },

  async getActiveDispatches() {
    const response = await api.get('/dispatch/active');
    return response.data;
  },

  async getDriverDispatch(driverId: number) {
    const response = await api.get(`/dispatch/driver/${driverId}`);
    return response.data;
  },

  async updateDispatchStatus(id: number, status: string) {
    const response = await api.post(`/dispatch/${id}/status`, { status });
    return response.data;
  },

  async getStats() {
    const response = await api.get('/dispatch/stats');
    return response.data;
  },

  async getAvailableOrders() {
    const response = await api.get('/dispatch/orders');
    return response.data;
  },

  async getAvailableDrivers() {
    const response = await api.get('/dispatch/drivers');
    return response.data;
  },

  async getAvailableVehicles() {
    const response = await api.get('/dispatch/vehicles');
    return response.data;
  }
};