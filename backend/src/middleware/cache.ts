import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cacheService';

const cacheService = CacheService.getInstance();

// Cache middleware for API responses
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const endpoint = req.route?.path || req.path;
    const params = { ...req.query, ...req.params };
    
    try {
      const cachedResponse = await cacheService.getCachedApiResponse(endpoint, params);
      
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.cacheApiResponse(endpoint, params, data, ttl);
        }
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Rate limiting middleware
export const rateLimitMiddleware = (limit: number = 100, window: number = 900) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate_limit:${req.ip}:${req.route?.path || req.path}`;
    
    try {
      const { allowed, remaining } = await cacheService.checkRateLimit(key, limit, window);
      
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      
      if (!allowed) {
        return res.status(429).json({
          message: 'Too many requests',
          retryAfter: window
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
};