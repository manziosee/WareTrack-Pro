import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function cleanDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🧹 Cleaning database...');
    
    // Delete all data from tables in correct order (respecting foreign key constraints)
    const cleanupQueries = [
      'DELETE FROM dispatches;',
      'DELETE FROM order_items;',
      'DELETE FROM delivery_orders;',
      'DELETE FROM drivers;',
      'DELETE FROM vehicles;',
      'DELETE FROM inventory_items;',
      'DELETE FROM users;'
    ];

    for (const query of cleanupQueries) {
      await pool.query(query);
      console.log(`✅ Cleaned: ${query.split(' ')[2].replace(';', '')}`);
    }

    // Reset sequences to start from 1
    const resetSequences = [
      'ALTER SEQUENCE users_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE inventory_items_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE vehicles_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE drivers_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE delivery_orders_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE order_items_id_seq RESTART WITH 1;',
      'ALTER SEQUENCE dispatches_id_seq RESTART WITH 1;'
    ];

    for (const query of resetSequences) {
      try {
        await pool.query(query);
      } catch (error) {
        // Ignore errors for sequences that don't exist
      }
    }

    console.log('🔄 Reset all ID sequences');
    console.log('✅ Database cleaned successfully');
    
    // Verify cleanup
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log('\n📊 Table status after cleanup:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanDatabase();