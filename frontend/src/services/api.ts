import axios from 'axios';
import { cache } from '@/utils/cache';
import { trackUsage } from './usageTelemetry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  // The free Render instance sleeps when idle and can take ~50s to wake up
  timeout: 75000,
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
  const companyId = localStorage.getItem('waretrack-company-id');
  const branchId = localStorage.getItem('waretrack-branch-id');
  if (companyId) config.headers['X-Company-Id'] = companyId;
  if (branchId) config.headers['X-Branch-Id'] = branchId;
  
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
    const method = (response.config.method || 'get').toLowerCase();
    const ok = response.status >= 200 && response.status < 300;
    const endpoint = response.config.url || '';
    const trackable = !endpoint.includes('/usage-events') && !endpoint.includes('/auth/') && !endpoint.includes('/customer/');
    const route = endpoint.replace(/\b\d+\b/g, ':id').split('?')[0];
    if (trackable && response.status >= 400) trackUsage('API_ERROR', route, { method: method.toUpperCase(), status: response.status });
    else if (trackable && ok && method !== 'get') trackUsage('ACTION', route, { method: method.toUpperCase(), status: response.status });

    // Any successful change makes cached lists stale
    if (method !== 'get' && ok) {
      cache.clear();
    }

    // Cache successful GET responses briefly
    if (method === 'get' && ok) {
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      cache.set(cacheKey, response.data, 0.5);
    }

    // 4xx responses don't throw (validateStatus), so handle an expired session here
    const isAuthCall = (response.config.url || '').includes('/auth/');
    if (response.status === 401 && !isAuthCall && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      cache.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login?expired=1';
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
    
    // Reject network failures so callers show an offline/error state instead of
    // treating an empty placeholder as a successful API response.
    if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message?.includes('ERR_CONNECTION_CLOSED') ||
        error.message?.includes('Network Error')) {
      console.warn('Network request failed:', error.message);
      return Promise.reject(new Error('Network unavailable. Check your connection and try again.'));
    }
    
    return Promise.reject(error);
  }
);

export default api;
