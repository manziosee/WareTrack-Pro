import axios from 'axios';
import { cache } from '../utils/cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api';

console.log('🔧 API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  mode: import.meta.env.MODE
});

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status < 500, // Don't reject on 4xx errors
});

// Request interceptor to add auth token and check cache
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Check cache for GET requests
  if (config.method === 'get') {
    const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return Promise.reject({ cached: true, data: cachedData });
    }
  }
  
  return config;
});

// Response interceptor to handle errors and cache responses
api.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === 'get') {
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      cache.set(cacheKey, response.data, 2); // Cache for 2 minutes
    }
    return response;
  },
  (error) => {
    // Handle cached responses
    if (error.cached) {
      return Promise.resolve({ data: error.data });
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle timeout and network errors
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timeout:', error.message);
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    // Return empty data for other network errors to prevent crashes
    if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message?.includes('ERR_CONNECTION_CLOSED') ||
        error.message?.includes('Network Error')) {
      console.warn('Network error, returning empty response:', error.message);
      return Promise.resolve({ data: { success: false, data: [], error: 'Network unavailable' } });
    }
    
    return Promise.reject(error);
  }
);

export default api;