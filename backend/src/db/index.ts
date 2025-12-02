import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { createDatabasePool } from '../utils/dbConnection';

// Create database connection
const pool = createDatabasePool();

export const db = drizzle(pool, { schema });
export { schema };