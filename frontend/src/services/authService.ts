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
    const { tokens, user } = response.data.data;
    
    localStorage.setItem('token', tokens.access);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token: tokens.access, user };
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
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

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};