const pool = require('../config/db');

/**
 * Check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[InvoiceModel Debug] Verifying company access. companyId: ${companyId}, userId: ${userId}`);
  const result = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Generate sequential invoice number.
 */
const generateInvoiceNumber = async (companyId, client) => {
  const countRes = await client.query(
    `SELECT COUNT(*) FROM invoices WHERE company_id = $1`,
    [companyId]
  );
  const count = parseInt(countRes.rows[0].count, 10);
  return `INV-26-${(count + 1).toString().padStart(4, '0')}`;
};

/**
 * Create a new Invoice.
 */
const createInvoice = async (userId, companyId, data) => {
  const {
    customer_id,
    invoice_type, // 'gst', 'proforma', 'quotation', 'estimate'
    invoice_date,
    items = []
  } = data;

  console.log(`[InvoiceModel Debug] Creating invoice in company ${companyId}. Type: ${invoice_type}, Items: ${items.length}`);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  // Validations
  if (!customer_id) throw new Error('Customer is required');
  if (!invoice_date) throw new Error('Invoice date is required');
  if (!items || items.length === 0) throw new Error('At least one line item is required');
  if (!['gst', 'proforma', 'quotation', 'estimate'].includes(invoice_type)) {
    throw new Error('Invalid invoice type');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch customer details
    console.log(`[InvoiceModel Debug] Loading customer details for ID ${customer_id}...`);
    const custRes = await client.query(
      `SELECT name, ledger_id FROM customers WHERE id = $1 AND company_id = $2`,
      [customer_id, companyId]
    );
    if (custRes.rows.length === 0) {
      throw new Error('Customer record not found');
    }
    const customer = custRes.rows[0];

    // 2. Calculate Subtotal, Tax and Grand Total
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstPct = parseFloat(item.gst_percentage) || 0;

      if (qty <= 0 || rate <= 0) {
        throw new Error('Quantity and Rate must be greater than zero');
      }

      const itemAmount = qty * rate;
      const itemTax = itemAmount * (gstPct / 100);

      subtotal += itemAmount;
      taxTotal += itemTax;

      // Validate stock availability if it is a GST invoice (since proforma/quotations don't affect stock)
      if (invoice_type === 'gst') {
        const stockRes = await client.query(
          `SELECT name, quantity FROM stock_items WHERE id = $1`,
          [item.stock_item_id]
        );
        if (stockRes.rows.length === 0) {
          throw new Error('Stock item not found');
        }
        const availableStock = parseFloat(stockRes.rows[0].quantity) || 0;
        if (availableStock < qty) {
          throw new Error(`Sufficient stock not available for ${stockRes.rows[0].name}. Available: ${availableStock}, Requested: ${qty}`);
        }
      }
    }

    const totalAmount = subtotal + taxTotal;
    console.log(`[InvoiceModel Debug] Calculations - Subtotal: ${subtotal}, Tax: ${taxTotal}, Total: ${totalAmount}`);

    // 3. Generate sequential invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId, client);
    console.log(`[InvoiceModel Debug] Generated invoice number: ${invoiceNumber}`);

    let voucherId = null;

    // 4. Double-Entry Posting for GST Tax Invoices
    if (invoice_type === 'gst') {
      console.log(`[InvoiceModel Debug] Processing accounting ledger entries for GST tax invoice...`);

      // Find Sales (Income) Ledger
      const salesLedgerRes = await client.query(
        `SELECT id FROM ledgers WHERE company_id = $1 AND ledger_type = 'income' LIMIT 1`,
        [companyId]
      );
      if (salesLedgerRes.rows.length === 0) {
        throw new Error('Sales Income account ledger not found. Please create an Income ledger first.');
      }
      const salesLedgerId = salesLedgerRes.rows[0].id;

      // Generate Voucher Number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM vouchers WHERE company_id = $1 AND voucher_type = 'sales'`,
        [companyId]
      );
      const salesCount = parseInt(countRes.rows[0].count, 10);
      const voucherNumber = `SAL-${salesCount + 1}`;

      // Insert Voucher Header
      const voucherHeaderRes = await client.query(
        `INSERT INTO vouchers (company_id, voucher_type, voucher_number, voucher_date, reference, narration, created_by)
         VALUES ($1, 'sales', $2, $3, $4, $5, $6) RETURNING id`,
        [companyId, voucherNumber, invoice_date, invoiceNumber, `Sales billing for ${customer.name}`, userId]
      );
      voucherId = voucherHeaderRes.rows[0].id;

      // Postings: Debit Customer Receivable
      await client.query(
        `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
         VALUES ($1, $2, 0, $3)`,
        [voucherId, customer.ledger_id, totalAmount]
      );

      // Postings: Credit Sales Account
      await client.query(
        `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
         VALUES ($1, $2, $3, 0)`,
        [voucherId, salesLedgerId, subtotal]
      );

      // Postings: Credit CGST & SGST Ledgers (if tax exists)
      if (taxTotal > 0) {
        const cgstLedger = await client.query(
          `SELECT id FROM ledgers WHERE company_id = $1 AND name ILIKE '%cgst%' LIMIT 1`,
          [companyId]
        );
        const sgstLedger = await client.query(
          `SELECT id FROM ledgers WHERE company_id = $1 AND name ILIKE '%sgst%' LIMIT 1`,
          [companyId]
        );

        if (cgstLedger.rows.length > 0 && sgstLedger.rows.length > 0) {
          const halfTax = taxTotal / 2;
          await client.query(
            `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
             VALUES ($1, $2, $3, 0)`,
            [voucherId, cgstLedger.rows[0].id, halfTax]
          );
          await client.query(
            `INSERT INTO voucher_entries (voucher_id, ledger_id, credit_amount, debit_amount)
             VALUES ($1, $2, $3, 0)`,
            [voucherId, sgstLedger.rows[0].id, halfTax]
          );
        } else {
          // Fallback: Credit entire tax to Sales Account
          await client.query(
            `UPDATE voucher_entries SET credit_amount = credit_amount + $1 WHERE voucher_id = $2 AND ledger_id = $3`,
            [taxTotal, voucherId, salesLedgerId]
          );
        }
      }

      // 5. Stock level reductions & inventory transactions log
      for (const item of items) {
        const qty = parseFloat(item.quantity);
        const rate = parseFloat(item.rate);
        const itemNotes = JSON.stringify({ rate, amount: qty * rate });

        await client.query(
          `INSERT INTO inventory_transactions (company_id, stock_item_id, transaction_type, quantity, reference_voucher_id, transaction_date, notes)
           VALUES ($1, $2, 'out', $3, $4, $5, $6)`,
          [companyId, item.stock_item_id, qty, voucherId, invoice_date, itemNotes]
        );

        await client.query(
          `UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2`,
          [qty, item.stock_item_id]
        );
      }
    }

    // 6. Save Invoice Record
    console.log(`[InvoiceModel Debug] Saving Invoice Header...`);
    const invoiceRes = await client.query(
      `INSERT INTO invoices (company_id, voucher_id, customer_id, invoice_number, invoice_type, invoice_date, subtotal, tax_amount, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved') RETURNING *`,
      [companyId, voucherId, customer_id, invoiceNumber, invoice_type, invoice_date, subtotal, taxTotal, totalAmount]
    );
    const invoice = invoiceRes.rows[0];

    // 7. Save Invoice Items Detail
    console.log(`[InvoiceModel Debug] Saving Invoice item rows...`);
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);
      const gstPct = parseFloat(item.gst_percentage) || 0;
      const amount = qty * rate;

      await client.query(
        `INSERT INTO invoice_items (invoice_id, stock_item_id, description, quantity, rate, gst_percentage, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoice.id, item.stock_item_id, item.description || null, qty, rate, gstPct, amount]
      );
    }

    await client.query('COMMIT');
    console.log(`[InvoiceModel Debug] Invoice created successfully.`);
    return { invoice, invoiceNumber };
  } catch (err) {
    console.error(`[InvoiceModel Error] Failed to create invoice, rolling back:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Retrieve list of invoices for a company.
 */
const getInvoicesByCompanyId = async (userId, companyId, filters = {}) => {
  const { invoice_type } = filters;
  console.log(`[InvoiceModel Debug] Listing invoices for company ${companyId}. Filters:`, filters);

  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this company');
  }

  try {
    let query = `
      SELECT i.*, c.name as customer_name 
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.company_id = $1
    `;
    const params = [companyId];

    if (invoice_type) {
      query += ` AND i.invoice_type = $2`;
      params.push(invoice_type);
    }

    query += ` ORDER BY i.invoice_date DESC, i.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error(`[InvoiceModel Error] Failed to list invoices:`, err);
    throw err;
  }
};

/**
 * Fetch detailed single invoice with items list.
 */
const getInvoiceById = async (userId, invoiceId) => {
  console.log(`[InvoiceModel Debug] Fetching invoice details for ID: ${invoiceId}`);
  try {
    const headerRes = await pool.query(
      `SELECT i.*, c.name as customer_name, c.mobile, c.email, c.gst_number, c.address 
       FROM invoices i 
       JOIN customers c ON i.customer_id = c.id 
       WHERE i.id = $1`,
      [invoiceId]
    );
    if (headerRes.rows.length === 0) return null;

    const invoice = headerRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(invoice.company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    // Get itemized details
    const itemsRes = await pool.query(
      `SELECT ii.*, si.name as item_name, si.sku 
       FROM invoice_items ii 
       JOIN stock_items si ON ii.stock_item_id = si.id 
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    // Get double-entry ledger entries from linked voucher
    let entries = [];
    if (invoice.voucher_id) {
      const entriesRes = await pool.query(
        `SELECT ve.*, l.name as ledger_name, l.ledger_type 
         FROM voucher_entries ve 
         JOIN ledgers l ON ve.ledger_id = l.id 
         WHERE ve.voucher_id = $1 
         ORDER BY ve.debit_amount DESC`,
        [invoice.voucher_id]
      );
      entries = entriesRes.rows;
    }

    return {
      ...invoice,
      items: itemsRes.rows,
      entries
    };
  } catch (err) {
    console.error(`[InvoiceModel Error] Failed to load invoice detail:`, err);
    throw err;
  }
};

/**
 * Delete invoice and reverse stock + entries.
 */
const deleteInvoice = async (userId, invoiceId) => {
  console.log(`[InvoiceModel Debug] Deleting invoice: ${invoiceId}`);

  const client = await pool.connect();
  try {
    const invoiceRes = await client.query(
      `SELECT company_id, voucher_id FROM invoices WHERE id = $1`,
      [invoiceId]
    );
    if (invoiceRes.rows.length === 0) throw new Error('Invoice not found');

    const { company_id, voucher_id } = invoiceRes.rows[0];
    const hasAccess = await checkUserCompanyAccess(company_id, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized: You do not have access to this company');
    }

    await client.query('BEGIN');

    // 1. Delete invoice items & invoice header first to release foreign key constraint on vouchers!
    console.log(`[InvoiceModel Debug] Deleting invoice_items for ID: ${invoiceId}`);
    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

    console.log(`[InvoiceModel Debug] Deleting invoice header record...`);
    await client.query(`DELETE FROM invoices WHERE id = $1`, [invoiceId]);

    // 2. Rollback stock movements and delete vouchers if associated sales voucher exists
    if (voucher_id) {
      console.log(`[InvoiceModel Debug] Reversing stock movements for voucher: ${voucher_id}`);
      const movementsRes = await client.query(
        `SELECT stock_item_id, quantity FROM inventory_transactions WHERE reference_voucher_id = $1`,
        [voucher_id]
      );
      for (const move of movementsRes.rows) {
        await client.query(
          `UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2`,
          [parseFloat(move.quantity), move.stock_item_id]
        );
      }

      console.log(`[InvoiceModel Debug] Deleting inventory transaction logs...`);
      await client.query(`DELETE FROM inventory_transactions WHERE reference_voucher_id = $1`, [voucher_id]);

      console.log(`[InvoiceModel Debug] Deleting voucher entries...`);
      await client.query(`DELETE FROM voucher_entries WHERE voucher_id = $1`, [voucher_id]);

      console.log(`[InvoiceModel Debug] Deleting voucher header...`);
      await client.query(`DELETE FROM vouchers WHERE id = $1`, [voucher_id]);
    }

    await client.query('COMMIT');
    console.log(`[InvoiceModel Debug] Invoice ID ${invoiceId} and linked voucher deleted successfully.`);
    return { id: invoiceId };
  } catch (err) {
    console.error(`[InvoiceModel Error] Failed to delete invoice, rolling back:`, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createInvoice,
  getInvoicesByCompanyId,
  getInvoiceById,
  deleteInvoice
};
