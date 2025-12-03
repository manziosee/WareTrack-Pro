import axios from 'axios';
import { cache } from '../utils/cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
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
    
    // Return empty data for network errors to prevent crashes
    if (error.code === 'ECONNABORTED' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      return Promise.resolve({ data: { success: false, data: [] } });
    }
    
    return Promise.reject(error);
  }
);

export default api;