import api from './api';

export interface InventoryItem {
  id: number;
  name: string;
  code: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: string;
  status: string;
  location?: string;
  supplier?: string;
  description?: string;
}

export interface CreateInventoryItem {
  name: string;
  code: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: string;
  location?: string;
  supplier?: string;
  description?: string;
}

export const inventoryService = {
  async getInventory(params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  async getInventoryById(id: number) {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  async createInventoryItem(data: CreateInventoryItem) {
    const response = await api.post('/inventory', data);
    return response.data;
  },

  async updateInventoryItem(id: number, data: Partial<CreateInventoryItem>) {
    const response = await api.put(`/inventory/${id}`, data);
    return response.data;
  },

  async deleteInventoryItem(id: number) {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/inventory/stats');
    return response.data.data;
  },

  async getLowStock() {
    const response = await api.get('/inventory/low-stock');
    return response.data.data;
  },

  async getCategories() {
    const response = await api.get('/inventory/categories');
    return response.data.data;
  },

  async getItemHistory(id: number) {
    const response = await api.get(`/inventory/${id}/history`);
    return response.data;
  },

  async bulkImport(items: CreateInventoryItem[]) {
    const response = await api.post('/inventory/import', { items });
    return response.data;
  }
};