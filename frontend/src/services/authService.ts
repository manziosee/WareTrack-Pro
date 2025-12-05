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
    try {
      console.log('🔄 Starting login request to:', import.meta.env.VITE_API_URL);
      console.log('📧 Login credentials:', { email: credentials.email, passwordLength: credentials.password.length });
      
      const response = await api.post('/auth/login', credentials);
      
      console.log('📥 Login response received:', {
        status: response.status,
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasUser: !!response.data?.data?.user,
        hasTokens: !!response.data?.data?.tokens
      });
      
      // Check if response is successful
      if (!response.data.success) {
        console.error('❌ Login failed - API returned error:', response.data.error);
        throw new Error(response.data.error?.message || 'Login failed');
      }
      
      // Extract data from successful response
      const data = response.data.data;
      const token = data.tokens?.access;
      const user = data.user;
      
      console.log('🔍 Extracted data:', {
        hasToken: !!token,
        hasUser: !!user,
        userRole: user?.role,
        tokenLength: token?.length
      });
      
      if (!token || !user) {
        console.error('❌ Invalid response format:', { token: !!token, user: !!user, data });
        throw new Error('Invalid login response format');
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Login successful, data stored in localStorage');
      return { token, user };
    } catch (error: any) {
      console.error('🚨 Login error caught:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data
      });
      
      // Handle network errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Connection timeout. Please check your internet connection and try again.');
      }
      
      // Handle API errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      
      // Re-throw the error if it's already formatted
      throw error;
    }
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