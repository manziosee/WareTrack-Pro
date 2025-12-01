import { redisClient } from '../config/redis';

export class CacheService {
  private static instance: CacheService;
  private defaultTTL = 3600; // 1 hour

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!redisClient.isReady) return null;
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      if (!redisClient.isReady) return;
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // Session management
  async setSession(sessionId: string, userId: number, ttl: number = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, { userId, createdAt: new Date() }, ttl);
  }

  async getSession(sessionId: string): Promise<{ userId: number; createdAt: Date } | null> {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // API response caching
  async cacheApiResponse(endpoint: string, params: any, response: any, ttl: number = 300): Promise<void> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    await this.set(key, response, ttl);
  }

  async getCachedApiResponse<T>(endpoint: string, params: any): Promise<T | null> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.get<T>(key);
  }

  // Frequently accessed data caching
  async cacheInventoryStats(stats: any): Promise<void> {
    await this.set('inventory:stats', stats, 600); // 10 minutes
  }

  async getCachedInventoryStats(): Promise<any> {
    return await this.get('inventory:stats');
  }

  async cacheUserStats(stats: any): Promise<void> {
    await this.set('user:stats', stats, 1800); // 30 minutes
  }

  async getCachedUserStats(): Promise<any> {
    return await this.get('user:stats');
  }

  async cacheDashboardStats(stats: any): Promise<void> {
    await this.set('dashboard:stats', stats, 300); // 5 minutes
  }

  async getCachedDashboardStats(): Promise<any> {
    return await this.get('dashboard:stats');
  }

  // Cache invalidation helpers
  async invalidateInventoryCache(): Promise<void> {
    await this.delPattern('inventory:*');
    await this.delPattern('api:inventory*');
    await this.delPattern('dashboard:*');
  }

  async invalidateOrderCache(): Promise<void> {
    await this.delPattern('order:*');
    await this.delPattern('api:orders*');
    await this.delPattern('dashboard:*');
  }

  async invalidateUserCache(): Promise<void> {
    await this.delPattern('user:*');
    await this.delPattern('api:users*');
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, window);
      }
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit };
    }
  }
}