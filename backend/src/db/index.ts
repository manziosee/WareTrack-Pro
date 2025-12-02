import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { createProductionPool } from './connection';

// Create database connection
const pool = createProductionPool();

export const db = drizzle(pool, { schema });
export { schema };