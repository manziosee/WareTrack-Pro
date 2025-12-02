import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Simple, reliable database connection for production
export function createProductionPool() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  // Use the connection string as-is for production
  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });
}

// Test connection with simple query
export async function testSimpleConnection(): Promise<boolean> {
  try {
    const pool = createProductionPool();
    const client = await pool.connect();
    
    try {
      await client.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      return true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}