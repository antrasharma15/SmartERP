const pool = require('./config/db');

async function testQuery() {
  try {
    const companyId = 'f3b6920c-d178-4221-9158-a7186b468c33';
    console.log('Testing lock query...');
    const result = await pool.query(
      `SELECT l.*, u.name as user_name, u.email as user_email 
       FROM system_locks l
       JOIN users u ON l.user_id = u.id
       WHERE l.company_id = $1 AND l.expires_at >= NOW()`,
      [companyId]
    );
    console.log('Query succeeded! Rows:', result.rows);
  } catch (err) {
    console.error('Query failed with error:', err);
  } finally {
    pool.end();
  }
}

testQuery();
