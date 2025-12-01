import { createClient } from 'redis';

let redisClient: any = null;
let isRedisAvailable = false;

// Only create Redis client if URL is provided
if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('❌ Redis max retries reached, disabling Redis');
            return false;
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis Error (continuing without Redis):', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis');
      isRedisAvailable = true;
    });

    redisClient.on('disconnect', () => {
      console.log('⚠️  Redis disconnected');
      isRedisAvailable = false;
    });
  } catch (error) {
    console.warn('⚠️  Redis client creation failed:', error.message);
    redisClient = null;
  }
}

export const connectRedis = async () => {
  if (!redisClient) {
    console.log('⚠️  Redis not configured, running without caching');
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    isRedisAvailable = true;
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.warn('⚠️  Redis connection failed, running without caching:', error.message);
    isRedisAvailable = false;
    // Don't throw error, just continue without Redis
  }
};

export const getRedisClient = () => {
  return isRedisAvailable && redisClient?.isOpen ? redisClient : null;
};

export const isRedisConnected = () => isRedisAvailable;

export { redisClient };