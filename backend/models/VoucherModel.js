const pool = require('../config/db');

/**
 * Helper to check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[VoucherModel Debug] Checking company access. companyId: ${companyId}, userId: ${userId}`);
  try {
    const result = await pool.query(
      `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
    const hasAccess = result.rows.length > 0;
    console.log(`[VoucherModel Debug] Access check: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    return hasAccess;
  } catch (err) {
    console.error(`[VoucherModel Error] Database error in checkUserCompanyAccess:`, err);
    throw new Error(`Database error verifying company access: ${err.message}`);
  }
};

/**
 * Generate sequential voucher number based on count.
 */
const generateVoucherNumber = async (companyId, voucherType, client) => {
  console.log(`[VoucherModel Debug] Generating voucher number for company ${companyId}, type: ${voucherType}`);
  try {
    const countRes = await client.query(
      `SELECT COUNT(*) FROM vouchers WHERE company_id = $1 AND voucher_type = $2`,
      [companyId, voucherType]
    );
    const count = parseInt(countRes.rows[0].count, 10);
    let prefix = '';
    if (voucherType === 'purchase') prefix = 'PUR';
    else if (voucherType === 'sales') prefix = 'SAL';
    else if (voucherType === 'receipt') prefix = 'RCT';
    else if (voucherType === 'payment') prefix = 'PMT';
    else prefix = 'JRN';

    const voucherNum = `${prefix}-${count + 1}`;
    console.log(`[VoucherModel Debug] Generated voucher number: ${voucherNum}`);
    return voucherNum;
  } catch (err) {
    console.error(`[VoucherModel Error] Failed to generate voucher number:`, err);
    throw err;
  }
};

/**
 * Create a new Purchase Voucher.
 */
const createPurchaseVoucher = async (userId, companyId, data) => {
  const {
    voucher_date,
    reference,
    narration,
    party_ledger_id,
    purchase_ledger_id,
    items,
    tax_entries = []
  } = data;

  console.log(`[VoucherModel Debug] Creating purchase voucher in company ${companyId}. Items count: ${items ? items.length : 0}`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  // Basic validation
  if (!voucher_date) throw new Error('Voucher date is required');
  if (!party_ledger_id) throw new Error('Party ledger account is required');
  if (!purchase_ledger_id) throw new Error('Purchase ledger account is required');
  if (!items || items.length === 0) throw new Error('At least one stock item is required for purchase');

  const client = await pool.connect();
  try {
    console.log(`[VoucherModel Debug] Beginning transaction...`);
    await client.query('BEGIN');

    // 1. Calculate values
    let itemsTotal = 0;
    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      if (qty <= 0 || rate <= 0) {
        throw new Error(`Quantity and Rate must be greater than zero for item ID ${item.stock_item_id}`);
      }
      itemsTotal += qty * rate;
    }

    let taxesTotal = 0;
    for (const tax of tax_entries) {
      taxesTotal += parseFloat(tax.amount) || 0;
    }

    const totalInvoiceAmount = itemsTotal + taxesTotal;
    console.log(`[VoucherModel Debug] Calculations - Items Total: ${itemsTotal}, Taxes Total: ${taxesTotal}, Invoice Grand Total: ${totalInvoiceAmount}`);

    // 2. Generate sequential number
    const voucherNumber = await generateVoucherNumber(companyId, 'purchase', client);

    // 3. Insert Voucher Header
    console.log(`[VoucherModel Debug] Inserting voucher header record...`);
    const voucherHeaderRes = await client.query(
      `INSERT INTO vouchers (company_id, voucher_type, voucher_number, voucher_date, reference, narration, created_by)
       VALUES ($1, 'purchase', $2, $3, $4, $5, $6) RETURNING *`,
      [companyId, voucherNumber, voucher_date, reference || null, narration || null, userId]
    );
    const voucher = voucherHeaderRes.rows[0];
    const voucherId = voucher.id;

    // 4. Double-Entry ledger postings
    console.log(`[VoucherModel Debug] Posting accounting entries for voucher ID ${voucherId}...`);
    
    // Credit Entry: Party (Supplier) Account
    await client.query(
      `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
       VALUES ($1, $2, $3, 0)`,
      [voucherId, party_ledger_id, totalInvoiceAmount]
    );

    // Debit Entry: Purchase Account
    await client.query(
      `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
       VALUES ($1, $2, 0, $3)`,
      [voucherId, purchase_ledger_id, itemsTotal]
    );

    // Debit Entries: GST Taxes accounts
    for (const tax of tax_entries) {
      if (parseFloat(tax.amount) > 0) {
        await client.query(
          `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
           VALUES ($1, $2, 0, $3)`,
          [voucherId, tax.ledger_id, tax.amount]
        );
      }
    }

    // 5. Stock items logging & update quantities
    console.log(`[VoucherModel Debug] Adjusting physical stock levels...`);
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);
      const itemNotes = JSON.stringify({ rate, amount: qty * rate });

      // Insert transaction log
      await client.query(
        `INSERT INTO inventory_transactions (company_id, stock_item_id, transaction_type, quantity, reference_voucher_id, transaction_date, notes)
         VALUES ($1, $2, 'in', $3, $4, $5, $6)`,
        [companyId, item.stock_item_id, qty, voucherId, voucher_date, itemNotes]
      );

      // Increment stock_items table quantity
      await client.query(
        `UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2`,
        [qty, item.stock_item_id]
      );
    }

    console.log(`[VoucherModel Debug] Committing SQL transaction...`);
    await client.query('COMMIT');
    console.log(`[VoucherModel Debug] Transaction committed successfully.`);
    return { voucher, voucherNumber };
  } catch (err) {
    console.error(`[VoucherModel Error] Failed to create purchase voucher, aborting transaction. Error:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Retrieve list of vouchers for a company with filters.
 */
const getVouchersByCompanyId = async (userId, companyId, filters = {}) => {
  const { voucher_type } = filters;
  console.log(`[VoucherModel Debug] Fetching vouchers for company ${companyId}. Filters:`, filters);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    let query = `
      SELECT v.*, 
        (SELECT name FROM ledgers l JOIN voucher_entries ve ON l.id = ve.ledger_id WHERE ve.voucher_id = v.id AND ve.credit_amount > 0 LIMIT 1) as party_name,
        (SELECT SUM(credit_amount) FROM voucher_entries ve WHERE ve.voucher_id = v.id) as total_amount
      FROM vouchers v
      WHERE v.company_id = $1
    `;
    const params = [companyId];

    if (voucher_type) {
      query += ` AND v.voucher_type = $2`;
      params.push(voucher_type);
    }

    query += ` ORDER BY v.voucher_date DESC, v.created_at DESC`;

    const result = await pool.query(query, params);
    console.log(`[VoucherModel Debug] Retrieved ${result.rows.length} vouchers.`);
    return result.rows;
  } catch (err) {
    console.error(`[VoucherModel Error] Database error listing vouchers:`, err);
    throw err;
  }
};

/**
 * Fetch detailed voucher information including entries and stock movements.
 */
const getVoucherById = async (userId, voucherId) => {
  console.log(`[VoucherModel Debug] Retrieving voucher details for ID: ${voucherId}`);
  try {
    // Get voucher header
    const headerRes = await pool.query(`SELECT * FROM vouchers WHERE id = $1`, [voucherId]);
    if (headerRes.rows.length === 0) return null;

    const voucher = headerRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(voucher.company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    // Get accounting ledger entries
    const entriesRes = await pool.query(
      `SELECT ve.*, l.name as ledger_name, l.ledger_type 
       FROM voucher_entries ve 
       JOIN ledgers l ON ve.ledger_id = l.id 
       WHERE ve.voucher_id = $1 
       ORDER BY ve.debit_amount DESC`,
      [voucherId]
    );

    // Get stock transaction items
    const itemsRes = await pool.query(
      `SELECT it.*, si.name as item_name, si.sku 
       FROM inventory_transactions it 
       JOIN stock_items si ON it.stock_item_id = si.id 
       WHERE it.reference_voucher_id = $1`,
      [voucherId]
    );

    // Map item rate/price fields from JSON notes
    const items = itemsRes.rows.map(row => {
      let rate = 0;
      let amount = 0;
      if (row.notes) {
        try {
          const parsed = JSON.parse(row.notes);
          rate = parsed.rate || 0;
          amount = parsed.amount || 0;
        } catch (e) {}
      }
      return {
        ...row,
        rate,
        amount
      };
    });

    return {
      ...voucher,
      entries: entriesRes.rows,
      items
    };
  } catch (err) {
    console.error(`[VoucherModel Error] Error loading voucher detail:`, err);
    throw err;
  }
};

/**
 * Delete a voucher and rollback stock quantity changes.
 */
const deleteVoucher = async (userId, voucherId) => {
  console.log(`[VoucherModel Debug] Deleting voucher ID: ${voucherId}`);
  
  const client = await pool.connect();
  try {
    // 1. Get header
    const headerRes = await client.query(`SELECT company_id, voucher_type FROM vouchers WHERE id = $1`, [voucherId]);
    if (headerRes.rows.length === 0) throw new Error('Voucher not found');

    const { company_id } = headerRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    console.log(`[VoucherModel Debug] Beginning delete transaction...`);
    await client.query('BEGIN');

    // 2. Fetch stock movements to reverse inventory quantities
    console.log(`[VoucherModel Debug] Reversing stock movements...`);
    const movementsRes = await client.query(
      `SELECT stock_item_id, quantity, transaction_type FROM inventory_transactions WHERE reference_voucher_id = $1`,
      [voucherId]
    );

    for (const movement of movementsRes.rows) {
      const qty = parseFloat(movement.quantity);
      if (movement.transaction_type === 'in') {
        // Rollback purchase -> subtract quantity
        await client.query(
          `UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2`,
          [qty, movement.stock_item_id]
        );
        console.log(`[VoucherModel Debug] Stock Rollback: Subtracted ${qty} from item ID ${movement.stock_item_id}`);
      } else if (movement.transaction_type === 'out') {
        // Rollback sale -> add quantity
        await client.query(
          `UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2`,
          [qty, movement.stock_item_id]
        );
        console.log(`[VoucherModel Debug] Stock Rollback: Restored ${qty} to item ID ${movement.stock_item_id}`);
      }
    }

    // 3. Delete related entries (DB might Cascade, but explicit is robust)
    await client.query(`DELETE FROM inventory_transactions WHERE reference_voucher_id = $1`, [voucherId]);
    await client.query(`DELETE FROM voucher_entries WHERE voucher_id = $1`, [voucherId]);
    await client.query(`DELETE FROM vouchers WHERE id = $1`, [voucherId]);

    await client.query('COMMIT');
    console.log(`[VoucherModel Debug] Voucher ID ${voucherId} deleted successfully.`);
    return { id: voucherId };
  } catch (err) {
    console.error(`[VoucherModel Error] Failed to delete voucher, rolling back. Error:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createPurchaseVoucher,
  getVouchersByCompanyId,
  getVoucherById,
  deleteVoucher
};
