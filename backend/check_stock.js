require('dotenv').config();
const pool = require('./config/db');

async function checkStock() {
  try {
    const res = await pool.query('SELECT company_id, COUNT(*) FROM stock_items GROUP BY company_id');
    console.log('--- STOCK ITEMS GROUPED BY COMPANY ---');
    console.log(res.rows);

    const resComp = await pool.query('SELECT id, name FROM companies');
    console.log('--- ALL COMPANIES ---');
    console.log(resComp.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkStock();
