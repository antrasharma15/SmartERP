require('dotenv').config();
const pool = require('./config/db');

async function inspectSchema() {
  try {
    const tables = ['companies', 'users', 'company_users'];
    for (const table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table]);
      console.log(`=== TABLE: ${table} ===`);
      console.log(res.rows);
    }

    // Let's also check if there are other tables like invoice_settings, tax_settings, etc.
    const allTablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('=== ALL TABLES ===');
    console.log(allTablesRes.rows.map(r => r.table_name));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

inspectSchema();
