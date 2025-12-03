import api from './api';

export interface Driver {
  id: number;
  userId: number;
  name: string;
  licenseNumber: string;
  phone: string;
  status: string;
  experience: number;
  rating: string;
}

export interface CreateDriver {
  name: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  dateOfBirth?: string;
  hireDate?: string;
  status?: string;
}

export const driversService = {
  async getDrivers(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const response = await api.get('/drivers', { params });
    return response.data;
  },

  async createDriver(data: CreateDriver) {
    const response = await api.post('/drivers', data);
    return response.data;
  },

  async updateDriver(id: number, data: Partial<CreateDriver>) {
    const response = await api.put(`/drivers/${id}`, data);
    return response.data;
  },

  async deleteDriver(id: number) {
    const response = await api.delete(`/drivers/${id}`);
    return response.data;
  },

  async getDriverAssignments(id: number) {
    const response = await api.get(`/drivers/${id}/assignments`);
    return response.data;
  }
};