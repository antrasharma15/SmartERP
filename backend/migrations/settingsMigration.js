require('dotenv').config();
const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[Migration] Starting settings tables migration...');

    // 1. Add logo_url and currency to companies
    await client.query(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '$'
    `);
    console.log('[Migration] Altered companies table successfully.');

    // 2. Add is_active to company_users
    await client.query(`
      ALTER TABLE company_users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
    console.log('[Migration] Altered company_users table successfully.');

    // 3. Create invoice_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
        auto_numbering_prefix VARCHAR(50) DEFAULT 'INV-',
        auto_numbering_start INT DEFAULT 1,
        template_preset VARCHAR(50) DEFAULT 'classic',
        default_payment_terms VARCHAR(50) DEFAULT 'net_30',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[Migration] Created invoice_settings table successfully.');

    // 4. Create tax_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        percentage NUMERIC NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[Migration] Created tax_settings table successfully.');

    // 5. Create notification_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
        invoice_sent BOOLEAN DEFAULT TRUE,
        payment_received BOOLEAN DEFAULT TRUE,
        overdue_reminder BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[Migration] Created notification_settings table successfully.');

    // 6. Create system_locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_locks (
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        locked_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);
    console.log('[Migration] Created system_locks table successfully.');

    await client.query('COMMIT');
    console.log('[Migration] Settings migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error] Settings migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
