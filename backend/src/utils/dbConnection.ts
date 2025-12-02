import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export function createDatabasePool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // For production, use connection string directly to avoid IPv6 issues
  if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      // Force IPv4
      options: '-c default_transaction_isolation=read_committed',
    });
  } else {
    // Parse the connection string for development
    const url = new URL(connectionString);
    
    pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  // Handle connection events
  pool.on('connect', () => {
    console.log('✅ Database pool connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
  });

  return pool;
}

export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const dbPool = createDatabasePool();
      const client = await dbPool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`🔄 Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}