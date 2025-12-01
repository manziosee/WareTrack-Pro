import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
  const pool = new Pool({
    host: 'db.exxpofcteuatggdxgbdk.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '8p!_q4fq2RhV9FU',
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();