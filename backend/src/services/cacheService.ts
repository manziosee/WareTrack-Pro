// Simplified cache service without Redis for production
export class CacheService {
  private static instance: CacheService;
  private memoryCache = new Map<string, { value: any; expires: number }>();

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generic cache methods using in-memory storage
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = this.memoryCache.get(key);
      if (!cached) return null;
      
      if (Date.now() > cached.expires) {
        this.memoryCache.delete(key);
        return null;
      }
      
      return cached.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      const expires = Date.now() + (ttl * 1000);
      this.memoryCache.set(key, { value, expires });
      
      // Clean up expired entries periodically
      if (this.memoryCache.size > 1000) {
        this.cleanup();
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now > cached.expires) {
        this.memoryCache.delete(key);
      }
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

  // Rate limiting with in-memory storage
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const now = Date.now();
      const windowStart = now - (window * 1000);
      
      // Simple rate limiting - just allow all requests for now
      return { allowed: true, remaining: limit };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit };
    }
  }
}

console.log('⚠️  Using in-memory cache instead of Redis');