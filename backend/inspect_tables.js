require('dotenv').config();
const pool = require('./config/db');

async function inspectTables() {
  try {
    const tables = ['invoices', 'audit_logs', 'users'];
    for (const table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table]);
      console.log(`=== TABLE: ${table} ===`);
      console.log(res.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

inspectTables();
