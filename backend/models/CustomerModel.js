const pool = require('../config/db');

/**
 * Check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[CustomerModel Debug] Verifying company access. companyId: ${companyId}, userId: ${userId}`);
  const result = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Create a new Customer.
 * Automatically creates a general ledger account of type 'customer'.
 */
const createCustomer = async (userId, companyId, data) => {
  const { name, mobile, email, gst_number, address } = data;
  console.log(`[CustomerModel Debug] Creating customer. Name: ${name}, Company: ${companyId}`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!name) throw new Error('Customer name is required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create a corresponding Ledger entry for double-entry records
    console.log(`[CustomerModel Debug] Creating ledger for customer...`);
    const ledgerRes = await client.query(
      `INSERT INTO ledgers (company_id, name, ledger_type, opening_balance, opening_balance_type)
       VALUES ($1, $2, 'customer', 0, 'dr') RETURNING id`,
      [companyId, name]
    );
    const ledgerId = ledgerRes.rows[0].id;
    console.log(`[CustomerModel Debug] Generated ledger ID: ${ledgerId}`);

    // 2. Create customer record linking the ledger
    console.log(`[CustomerModel Debug] Inserting customer record...`);
    const customerRes = await client.query(
      `INSERT INTO customers (company_id, ledger_id, name, mobile, email, gst_number, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [companyId, ledgerId, name, mobile || null, email || null, gst_number || null, address || null]
    );

    await client.query('COMMIT');
    console.log(`[CustomerModel Debug] Customer created successfully.`);
    return customerRes.rows[0];
  } catch (err) {
    console.error(`[CustomerModel Error] Failed to create customer, rolling back:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * List all customers for a company.
 */
const getCustomersByCompanyId = async (userId, companyId) => {
  console.log(`[CustomerModel Debug] Listing customers for company ${companyId}`);
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT * FROM customers WHERE company_id = $1 ORDER BY name ASC`,
      [companyId]
    );
    return result.rows;
  } catch (err) {
    console.error(`[CustomerModel Error] Failed to query customers:`, err);
    throw err;
  }
};

/**
 * Delete customer and associated ledger.
 */
const deleteCustomer = async (userId, customerId) => {
  console.log(`[CustomerModel Debug] Deleting customer: ${customerId}`);
  
  const client = await pool.connect();
  try {
    const customerRes = await client.query(`SELECT company_id, ledger_id FROM customers WHERE id = $1`, [customerId]);
    if (customerRes.rows.length === 0) throw new Error('Customer not found');
    
    const { company_id, ledger_id } = customerRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    await client.query('BEGIN');

    // Delete customer
    await client.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
    
    // Delete ledger (check constraints might block it if has vouchers)
    await client.query(`DELETE FROM ledgers WHERE id = $1`, [ledger_id]);

    await client.query('COMMIT');
    console.log(`[CustomerModel Debug] Customer ID ${customerId} deleted.`);
    return { id: customerId };
  } catch (err) {
    console.error(`[CustomerModel Error] Failed to delete customer, rolling back:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createCustomer,
  getCustomersByCompanyId,
  deleteCustomer
};
