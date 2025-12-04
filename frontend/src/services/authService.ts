import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin?: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    
    // Handle different response formats
    const data = response.data.data || response.data;
    const token = data.token || data.tokens?.access || data.accessToken;
    const user = data.user;
    
    if (!token || !user) {
      throw new Error('Invalid login response format');
    }
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async refreshToken() {
    const response = await api.post('/auth/refresh');
    const { token } = response.data.data;
    localStorage.setItem('token', token);
    return token;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  async updateProfile(data: { name: string; email: string; phone: string }) {
    const response = await api.put('/auth/profile', data);
    const updatedUser = response.data.data;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  async getUserActivity() {
    const response = await api.get('/auth/activity');
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};