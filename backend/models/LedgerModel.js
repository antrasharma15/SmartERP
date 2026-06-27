const pool = require('../config/db');

/**
 * Helper to check if a user is associated with a company.
 * Logs query parameters and results for diagnostic purposes.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[LedgerModel Debug] Checking company access. companyId: ${companyId}, userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
    const hasAccess = result.rows.length > 0;
    console.log(`[LedgerModel Debug] Company access check result: ${hasAccess ? 'ACCESS_GRANTED' : 'ACCESS_DENIED'} (role: ${hasAccess ? result.rows[0].role : 'none'})`);
    return hasAccess;
  } catch (err) {
    console.error(`[LedgerModel Error] Database error in checkUserCompanyAccess:`, err);
    throw new Error(`Database error verifying company access: ${err.message}`);
  }
};

/**
 * Get all ledgers for a company.
 */
const getLedgersByCompanyId = async (userId, companyId) => {
  console.log(`[LedgerModel Debug] Fetching ledgers for companyId: ${companyId} requested by userId: ${userId}`);
  
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    console.warn(`[LedgerModel Warning] Unauthorized attempt to list ledgers. companyId: ${companyId}, userId: ${userId}`);
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT l.*, g.name as group_name 
       FROM ledgers l 
       LEFT JOIN groups g ON l.group_id = g.id 
       WHERE l.company_id = $1 
       ORDER BY l.name ASC`,
      [companyId]
    );
    console.log(`[LedgerModel Debug] Successfully retrieved ${result.rows.length} ledgers for companyId: ${companyId}`);
    return result.rows;
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to retrieve ledgers for companyId: ${companyId}. Database error:`, err);
    throw new Error(`Database error fetching ledgers: ${err.message}`);
  }
};

/**
 * Create a new ledger.
 */
const createLedger = async (userId, companyId, ledgerData) => {
  const { name, group_id, ledger_type, opening_balance, opening_balance_type } = ledgerData;
  console.log(`[LedgerModel Debug] Creating ledger in companyId: ${companyId} by userId: ${userId}. Input details:`, {
    name, group_id, ledger_type, opening_balance, opening_balance_type
  });

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    console.warn(`[LedgerModel Warning] Unauthorized attempt to create ledger. companyId: ${companyId}, userId: ${userId}`);
    throw new Error('Unauthorized: You do not have access to this company');
  }

  if (!name || name.trim() === '') {
    console.warn(`[LedgerModel Warning] Attempted to create ledger with empty name.`);
    throw new Error('Ledger name is required');
  }

  if (!ledger_type || ledger_type.trim() === '') {
    console.warn(`[LedgerModel Warning] Attempted to create ledger with empty ledger_type.`);
    throw new Error('Ledger type is required');
  }

  try {
    // Check for duplicate name in this company (case-insensitive)
    console.log(`[LedgerModel Debug] Verifying ledger name uniqueness: "${name}" in company: ${companyId}`);
    const duplicateCheck = await pool.query(
      `SELECT id FROM ledgers WHERE company_id = $1 AND LOWER(name) = LOWER($2)`,
      [companyId, name.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      console.warn(`[LedgerModel Warning] Ledger name duplicate found: "${name}" (ID: ${duplicateCheck.rows[0].id}) in company: ${companyId}`);
      throw new Error(`A ledger with the name "${name}" already exists in this company`);
    }

    const result = await pool.query(
      `INSERT INTO ledgers (
        company_id, group_id, name, ledger_type, 
        opening_balance, opening_balance_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING *`,
      [
        companyId,
        group_id || null,
        name.trim(),
        ledger_type.trim().toLowerCase(),
        opening_balance || 0,
        opening_balance_type || 'dr'
      ]
    );

    const newLedger = result.rows[0];
    console.log(`[LedgerModel Debug] Ledger created successfully. New ID: ${newLedger.id}`);
    return newLedger;
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to create ledger in company: ${companyId}. Database error:`, err);
    throw err;
  }
};

/**
 * Get details of a single ledger.
 */
const getLedgerById = async (userId, ledgerId) => {
  console.log(`[LedgerModel Debug] Fetching details for ledgerId: ${ledgerId} by userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT * FROM ledgers WHERE id = $1`,
      [ledgerId]
    );

    if (result.rows.length === 0) {
      console.warn(`[LedgerModel Warning] Ledger not found. ID: ${ledgerId}`);
      return null;
    }

    const ledger = result.rows[0];
    console.log(`[LedgerModel Debug] Ledger record retrieved. Verifying company access...`);
    
    const hasAccess = await checkUserCompanyAccess(ledger.company_id, userId);
    if (!hasAccess) {
      console.warn(`[LedgerModel Warning] Unauthorized attempt to access ledger details. ledgerId: ${ledgerId}, companyId: ${ledger.company_id}, userId: ${userId}`);
      throw new Error('Unauthorized: You do not have access to this ledger');
    }

    return ledger;
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to fetch ledger: ${ledgerId}. Error:`, err);
    throw err;
  }
};

/**
 * Update an existing ledger.
 */
const updateLedger = async (userId, ledgerId, ledgerData) => {
  const { name, group_id, ledger_type, opening_balance, opening_balance_type } = ledgerData;
  console.log(`[LedgerModel Debug] Updating ledger ID: ${ledgerId} by userId: ${userId}. Update details:`, {
    name, group_id, ledger_type, opening_balance, opening_balance_type
  });

  try {
    const ledgerResult = await pool.query(`SELECT company_id FROM ledgers WHERE id = $1`, [ledgerId]);
    if (ledgerResult.rows.length === 0) {
      console.warn(`[LedgerModel Warning] Ledger not found for update. ID: ${ledgerId}`);
      throw new Error('Ledger not found');
    }

    const companyId = ledgerResult.rows[0].company_id;
    const hasAccess = await checkUserCompanyAccess(companyId, userId);
    if (!hasAccess) {
      console.warn(`[LedgerModel Warning] Unauthorized attempt to update ledger ID: ${ledgerId}. userId: ${userId}`);
      throw new Error('Unauthorized: You do not have access to this company');
    }

    if (!name || name.trim() === '') {
      throw new Error('Ledger name is required');
    }

    if (!ledger_type || ledger_type.trim() === '') {
      throw new Error('Ledger type is required');
    }

    // Check duplicate name excluding current ledger
    console.log(`[LedgerModel Debug] Checking ledger name uniqueness for update. ID: ${ledgerId}, Name: "${name}"`);
    const duplicateCheck = await pool.query(
      `SELECT id FROM ledgers WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [companyId, name.trim(), ledgerId]
    );

    if (duplicateCheck.rows.length > 0) {
      console.warn(`[LedgerModel Warning] Duplicate ledger name found on update: "${name}" (ID: ${duplicateCheck.rows[0].id}) in company: ${companyId}`);
      throw new Error(`A ledger with the name "${name}" already exists in this company`);
    }

    const result = await pool.query(
      `UPDATE ledgers 
       SET name = $1, group_id = $2, ledger_type = $3, 
           opening_balance = $4, opening_balance_type = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name.trim(),
        group_id || null,
        ledger_type.trim().toLowerCase(),
        opening_balance || 0,
        opening_balance_type || 'dr',
        ledgerId
      ]
    );

    const updatedLedger = result.rows[0];
    console.log(`[LedgerModel Debug] Ledger updated successfully. ID: ${updatedLedger.id}`);
    return updatedLedger;
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to update ledger ID: ${ledgerId}. Error:`, err);
    throw err;
  }
};

/**
 * Delete a ledger.
 */
const deleteLedger = async (userId, ledgerId) => {
  console.log(`[LedgerModel Debug] Deleting ledger ID: ${ledgerId} requested by userId: ${userId}`);
  try {
    const ledgerResult = await pool.query(`SELECT company_id, name FROM ledgers WHERE id = $1`, [ledgerId]);
    if (ledgerResult.rows.length === 0) {
      console.warn(`[LedgerModel Warning] Ledger not found for deletion. ID: ${ledgerId}`);
      throw new Error('Ledger not found');
    }

    const { company_id, name } = ledgerResult.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) {
      console.warn(`[LedgerModel Warning] Unauthorized attempt to delete ledger ID: ${ledgerId}. userId: ${userId}`);
      throw new Error('Unauthorized: You do not have access to this company');
    }

    const result = await pool.query(
      `DELETE FROM ledgers WHERE id = $1 RETURNING *`,
      [ledgerId]
    );

    console.log(`[LedgerModel Debug] Ledger "${name}" (ID: ${ledgerId}) deleted successfully.`);
    return result.rows[0];
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to delete ledger ID: ${ledgerId}. Error:`, err);
    throw err;
  }
};

/**
 * Get all groups for a company.
 */
const getGroupsByCompanyId = async (userId, companyId) => {
  console.log(`[LedgerModel Debug] Fetching groups for companyId: ${companyId} requested by userId: ${userId}`);
  
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    console.warn(`[LedgerModel Warning] Unauthorized attempt to list groups. companyId: ${companyId}, userId: ${userId}`);
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    const result = await pool.query(
      `SELECT * FROM groups WHERE company_id = $1 ORDER BY name ASC`,
      [companyId]
    );
    console.log(`[LedgerModel Debug] Successfully retrieved ${result.rows.length} groups for companyId: ${companyId}`);
    return result.rows;
  } catch (err) {
    console.error(`[LedgerModel Error] Failed to retrieve groups for companyId: ${companyId}. Database error:`, err);
    throw new Error(`Database error fetching groups: ${err.message}`);
  }
};

module.exports = {
  getLedgersByCompanyId,
  createLedger,
  getLedgerById,
  updateLedger,
  deleteLedger,
  getGroupsByCompanyId
};
