require('dotenv').config();
const pool = require('../config/db');

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('[InitDB] Starting SmartERP database schema verification and migration...');
    await client.query('BEGIN');

    // 1. Enable pgcrypto extension for UUID generation
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // 2. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        verification_token_expires TIMESTAMP,
        reset_password_token TEXT,
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. Companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        gst_number VARCHAR(50),
        state VARCHAR(100),
        financial_year_start DATE,
        financial_year_end DATE,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT '₹',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '₹'
    `);

    // This is a GST / Indian-financial-year product, so the rupee is the
    // default. ADD COLUMN IF NOT EXISTS above leaves an existing column's
    // default untouched, so older databases need it set explicitly.
    await client.query(`
      ALTER TABLE companies ALTER COLUMN currency SET DEFAULT '₹'
    `);

    // 4. Company Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(company_id, user_id)
      )
    `);
    await client.query(`
      ALTER TABLE company_users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);

    // 5. Account Groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'income', 'expense')),
        parent_id UUID REFERENCES groups(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 6. Ledgers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledgers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        ledger_type VARCHAR(50) NOT NULL,
        opening_balance NUMERIC DEFAULT 0,
        opening_balance_type VARCHAR(10) DEFAULT 'dr',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 7. Units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 8. Stock Groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        parent_id UUID REFERENCES stock_groups(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 9. Stock Items table (with sku, purchase_price, selling_price, quantity, reorder_level)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        stock_group_id UUID REFERENCES stock_groups(id) ON DELETE SET NULL,
        unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        hsn_code VARCHAR(50),
        purchase_price NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        gst_percentage NUMERIC DEFAULT 0,
        reorder_level NUMERIC DEFAULT 0,
        quantity NUMERIC DEFAULT 0,
        valuation_method VARCHAR(20) DEFAULT 'fifo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20) DEFAULT 'fifo',
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50)
    `);
    console.log('[InitDB] Verified stock_items table and all columns.');

    // 10. Vouchers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        voucher_type VARCHAR(50) NOT NULL,
        voucher_number VARCHAR(100) NOT NULL,
        voucher_date DATE NOT NULL,
        reference VARCHAR(255),
        narration TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 11. Voucher Entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS voucher_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
        ledger_id UUID REFERENCES ledgers(id) ON DELETE RESTRICT,
        debit_amount NUMERIC DEFAULT 0,
        credit_amount NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 12. Inventory Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL,
        quantity NUMERIC NOT NULL,
        reference_voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
        transaction_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 13. Customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50),
        email VARCHAR(255),
        gst_number VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 14. Invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
        voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
        invoice_number VARCHAR(100) NOT NULL,
        invoice_type VARCHAR(50) NOT NULL,
        invoice_date DATE NOT NULL,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        tax_amount NUMERIC NOT NULL DEFAULT 0,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0
    `);

    // Databases created before tax_amount existed still carry the original
    // `tax_total NOT NULL` column. CREATE TABLE IF NOT EXISTS above never
    // reshapes an existing table, so those databases kept a NOT NULL column
    // that no code path writes — every invoice INSERT failed with a constraint
    // violation. Nothing reads tax_total (model, API and UI all use
    // tax_amount), so carry any value across and drop it.
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'invoices' AND column_name = 'tax_total'
        ) THEN
          UPDATE invoices
             SET tax_amount = tax_total
           WHERE tax_total IS NOT NULL
             AND COALESCE(tax_amount, 0) = 0;
          ALTER TABLE invoices DROP COLUMN tax_total;
        END IF;
      END $$;
    `);

    // 15. Invoice Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        stock_item_id UUID REFERENCES stock_items(id) ON DELETE RESTRICT,
        description TEXT,
        quantity NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        gst_percentage NUMERIC DEFAULT 0,
        amount NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 16. Invoice Settings table
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

    // 17. Tax Settings table
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

    // 18. Notification Settings table
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

    // 19. System Locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_locks (
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        locked_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // 20. Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(100),
        new_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('[InitDB] All SmartERP database tables and columns verified successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[InitDB Error] Database initialization failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

initializeDatabase();
