import api from './api';

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  status: string;
  totalAmount: string;
  orderDate: string;
  deliveryDate?: string;
}

export interface CreateOrder {
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  totalAmount: number;
  items: Array<{
    inventoryItemId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export const ordersService = {
  async getOrders(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  async getOrderById(id: number) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  async createOrder(data: CreateOrder) {
    const response = await api.post('/orders', data);
    return response.data;
  },

  async updateOrder(id: number, data: Partial<CreateOrder>) {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  },

  async updateOrderStatus(id: number, data: { status: string; [key: string]: any }) {
    const response = await api.post(`/orders/${id}/status`, data);
    return response.data;
  },

  async getOrderStatuses() {
    const response = await api.get('/orders/status');
    return response.data.data;
  },

  async getOrdersByCustomer(customerId: number) {
    const response = await api.get(`/orders/customer/${customerId}`);
    return response.data;
  }
};