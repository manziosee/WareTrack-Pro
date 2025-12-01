import { createClient } from 'redis';

const redisClient = createClient({
  username: 'default',
  password: 'AIdDsSCoXEfTZh6nvaC53D0F2hsdIIkO',
  socket: {
    host: 'redis-13712.c73.us-east-1-2.ec2.cloud.redislabs.com',
    port: 13712
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.warn('⚠️  Redis not available, running without caching:', error.message);
    // Don't exit process, just continue without Redis
  }
};

export { redisClient };