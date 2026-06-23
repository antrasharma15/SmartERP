const pool = require('../config/db');

/**
 * Count the number of companies owned/created by the user.
 */
const countCompaniesByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM companies WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Create a new company along with company_user association and default groups in a transaction.
 */
const createCompany = async (userId, companyData) => {
  const {
    name,
    address,
    gst_number,
    state,
    financial_year_start,
    financial_year_end,
    contact_email,
    contact_phone
  } = companyData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Company
    const companyRes = await client.query(
      `INSERT INTO companies (
        user_id, name, address, gst_number, state, 
        financial_year_start, financial_year_end, contact_email, contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        userId, name, address || null, gst_number || null, state || null,
        financial_year_start || null, financial_year_end || null,
        contact_email || null, contact_phone || null
      ]
    );
    const company = companyRes.rows[0];

    // 2. Insert into company_users as 'owner'
    await client.query(
      `INSERT INTO company_users (company_id, user_id, role) 
      VALUES ($1, $2, $3)`,
      [company.id, userId, 'owner']
    );

    // 3. Seed default groups (Assets, Liabilities, Income, Expenses)
    const defaultGroups = [
      { name: 'Assets', type: 'asset' },
      { name: 'Liabilities', type: 'liability' },
      { name: 'Income', type: 'income' },
      { name: 'Expenses', type: 'expense' }
    ];

    for (const group of defaultGroups) {
      await client.query(
        `INSERT INTO groups (company_id, name, type) 
        VALUES ($1, $2, $3)`,
        [company.id, group.name, group.type]
      );
    }

    await client.query('COMMIT');
    return company;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get all companies associated with a user.
 */
const getCompaniesByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT c.*, cu.role 
     FROM companies c
     JOIN company_users cu ON c.id = cu.company_id
     WHERE cu.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Get details of a single company, ensuring user has access.
 */
const getCompanyById = async (companyId, userId) => {
  const result = await pool.query(
    `SELECT c.*, cu.role 
     FROM companies c
     JOIN company_users cu ON c.id = cu.company_id
     WHERE c.id = $1 AND cu.user_id = $2`,
    [companyId, userId]
  );
  return result.rows[0];
};

/**
 * Update details of a company, ensuring user is authorized (owner).
 */
const updateCompany = async (companyId, userId, companyData) => {
  // Check authorization
  const authCheck = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  
  if (!authCheck.rows[0] || authCheck.rows[0].role !== 'owner') {
    throw new Error('Unauthorized: Only the company owner can update company details');
  }

  const {
    name,
    address,
    gst_number,
    state,
    financial_year_start,
    financial_year_end,
    contact_email,
    contact_phone
  } = companyData;

  const result = await pool.query(
    `UPDATE companies 
     SET name = $1, address = $2, gst_number = $3, state = $4, 
         financial_year_start = $5, financial_year_end = $6, 
         contact_email = $7, contact_phone = $8, updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      name, address || null, gst_number || null, state || null,
      financial_year_start || null, financial_year_end || null,
      contact_email || null, contact_phone || null, companyId
    ]
  );
  return result.rows[0];
};

/**
 * Delete a company, ensuring user is authorized (owner).
 */
const deleteCompany = async (companyId, userId) => {
  // Check authorization
  const authCheck = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );

  if (!authCheck.rows[0] || authCheck.rows[0].role !== 'owner') {
    throw new Error('Unauthorized: Only the company owner can delete the company');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete associations in company_users first (to satisfy foreign key constraints if they aren't ON DELETE CASCADE)
    await client.query(`DELETE FROM company_users WHERE company_id = $1`, [companyId]);
    
    // Delete seeded groups (since they reference the company)
    await client.query(`DELETE FROM groups WHERE company_id = $1`, [companyId]);

    // Delete the company
    const result = await client.query(
      `DELETE FROM companies WHERE id = $1 RETURNING *`,
      [companyId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  countCompaniesByUserId,
  createCompany,
  getCompaniesByUserId,
  getCompanyById,
  updateCompany,
  deleteCompany
};
