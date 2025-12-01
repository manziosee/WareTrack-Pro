import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
}

export const usersService = {
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async getUserById(id: number) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUser) {
    const response = await api.post('/users', data);
    return response.data;
  },

  async updateUser(id: number, data: Partial<CreateUser>) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: number) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};