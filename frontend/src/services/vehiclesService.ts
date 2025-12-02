import api from './api';

export interface Vehicle {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  type: string;
  capacity: number;
  status: string;
}

export interface CreateVehicle {
  plateNumber: string;
  type: string;
  capacity: number;
  vehicleModel?: string;
  year?: number;
  fuelType?: string;
  status?: string;
}

export const vehiclesService = {
  async getVehicles(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const response = await api.get('/vehicles', { params });
    return response.data;
  },

  async getVehicleById(id: number) {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  async createVehicle(data: CreateVehicle) {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  async updateVehicle(id: number, data: Partial<CreateVehicle>) {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },

  async deleteVehicle(id: number) {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },

  async getVehicleStatuses() {
    const response = await api.get('/vehicles/status');
    return response.data.data;
  },

  async getMaintenanceHistory(id: number) {
    const response = await api.get(`/vehicles/${id}/maintenance`);
    return response.data;
  },

  async scheduleMaintenance(id: number, data: any) {
    const response = await api.post(`/vehicles/${id}/maintenance`, data);
    return response.data;
  }
};