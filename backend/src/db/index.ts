import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  host: 'db.exxpofcteuatggdxgbdk.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '8p!_q4fq2RhV9FU',
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export { schema };