const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Helper to check if a user is an owner or admin of the company
const checkCompanyAccess = async (companyId, userId, allowedRoles = ['owner', 'admin']) => {
  const result = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2 AND is_active = TRUE`,
    [companyId, userId]
  );
  if (result.rows.length === 0) {
    throw new Error('Access Denied: You are not a member of this company');
  }
  const role = result.rows[0].role;
  if (!allowedRoles.includes(role)) {
    throw new Error('Access Denied: Insufficient permissions for this action');
  }
  return role;
};

/**
 * Update Company settings (Company/Organization Profile)
 */
const updateCompanySettings = async (req, res) => {
  const { company_id, name, address, contact_email, contact_phone, currency, logo_url } = req.body;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    const result = await pool.query(
      `UPDATE companies 
       SET name = $1, address = $2, contact_email = $3, contact_phone = $4, currency = $5, logo_url = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, address || null, contact_email || null, contact_phone || null, currency || '$', logo_url || null, company_id]
    );

    // Write audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'UPDATE_SETTINGS', 'companies', company_id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Company settings updated successfully', company: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] updateCompanySettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Lock Status
 */
const getLockStatus = async (req, res) => {
  const { company_id } = req.query;
  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(company_id)) {
    return res.status(400).json({ message: 'Invalid company_id format' });
  }

  try {
    const lockRes = await pool.query(
      `SELECT l.*, u.name as user_name, u.email as user_email 
       FROM system_locks l
       JOIN users u ON l.user_id = u.id
       WHERE l.company_id = $1 AND l.expires_at >= NOW()`,
      [company_id]
    );

    if (lockRes.rows.length === 0) {
      return res.json({ locked: false });
    }

    const lock = lockRes.rows[0];
    res.json({
      locked: true,
      user_id: lock.user_id,
      user_name: lock.user_name,
      user_email: lock.user_email,
      locked_at: lock.locked_at,
      expires_at: lock.expires_at,
      is_current_user: lock.user_id === req.user.id
    });
  } catch (err) {
    console.error('[SettingsController] getLockStatus error:', err);
    res.status(500).json({ message: 'Error checking lock status' });
  }
};

/**
 * Release system lock (Force Release - Owner only)
 */
const releaseLock = async (req, res) => {
  const { company_id } = req.body;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(company_id)) {
    return res.status(400).json({ message: 'Invalid company_id format' });
  }

  try {
    // Only the Owner can force release the lock
    await checkCompanyAccess(company_id, userId, ['owner']);

    await pool.query('DELETE FROM system_locks WHERE company_id = $1', [company_id]);

    // Write audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name)
       VALUES ($1, $2, $3, $4)`,
      [company_id, userId, 'FORCE_RELEASE_LOCK', 'system_locks']
    );

    res.json({ message: 'System lock released successfully' });
  } catch (err) {
    console.error('[SettingsController] releaseLock error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * User Management: List users in the company
 */
const getCompanyUsers = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant', 'viewer']);

    const usersRes = await pool.query(
      `SELECT u.id, u.name, u.email, cu.role, cu.is_active
       FROM company_users cu
       JOIN users u ON cu.user_id = u.id
       WHERE cu.company_id = $1
       ORDER BY cu.role = 'owner' DESC, u.name ASC`,
      [company_id]
    );

    res.json({ users: usersRes.rows });
  } catch (err) {
    console.error('[SettingsController] getCompanyUsers error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * User Management: Add/invite user by email
 */
const inviteCompanyUser = async (req, res) => {
  const { company_id, email, role } = req.body;
  const userId = req.user.id;

  if (!company_id || !email || !role) {
    return res.status(400).json({ message: 'company_id, email, and role are required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    // Find the user by email
    const userRes = await pool.query('SELECT id, name FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found. They must register in SmartERP first.' });
    }
    const invitee = userRes.rows[0];

    // Check if user is already added to company
    const checkDup = await pool.query(
      'SELECT id FROM company_users WHERE company_id = $1 AND user_id = $2',
      [company_id, invitee.id]
    );
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this company' });
    }

    // Insert user into company_users
    await pool.query(
      `INSERT INTO company_users (company_id, user_id, role, is_active)
       VALUES ($1, $2, $3, TRUE)`,
      [company_id, invitee.id, role]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'ADD_USER', 'company_users', invitee.id, JSON.stringify({ email, role })]
    );

    res.status(201).json({ message: `User "${invitee.name}" successfully added to company.` });
  } catch (err) {
    console.error('[SettingsController] inviteCompanyUser error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * User Management: Update user role
 */
const updateCompanyUserRole = async (req, res) => {
  const { company_id, target_user_id, role } = req.body;
  const userId = req.user.id;

  if (!company_id || !target_user_id || !role) {
    return res.status(400).json({ message: 'company_id, target_user_id, and role are required' });
  }

  try {
    const callerRole = await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    // Check target user's role
    const targetCheck = await pool.query(
      'SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2',
      [company_id, target_user_id]
    );

    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in company' });
    }

    const targetRole = targetCheck.rows[0].role;
    if (targetRole === 'owner') {
      return res.status(403).json({ message: 'Cannot modify role of the company owner' });
    }

    if (callerRole === 'admin' && targetRole === 'admin') {
      return res.status(403).json({ message: 'Admins cannot modify other Admins' });
    }

    await pool.query(
      'UPDATE company_users SET role = $1 WHERE company_id = $2 AND user_id = $3',
      [role, company_id, target_user_id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'UPDATE_USER_ROLE', 'company_users', target_user_id, JSON.stringify({ role })]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error('[SettingsController] updateCompanyUserRole error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * User Management: Toggle active/inactive status
 */
const toggleCompanyUserStatus = async (req, res) => {
  const { company_id, target_user_id, is_active } = req.body;
  const userId = req.user.id;

  if (!company_id || !target_user_id || is_active === undefined) {
    return res.status(400).json({ message: 'company_id, target_user_id, and is_active are required' });
  }

  try {
    const callerRole = await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    const targetCheck = await pool.query(
      'SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2',
      [company_id, target_user_id]
    );

    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in company' });
    }

    const targetRole = targetCheck.rows[0].role;
    if (targetRole === 'owner') {
      return res.status(403).json({ message: 'Cannot deactivate the company owner' });
    }

    if (callerRole === 'admin' && targetRole === 'admin') {
      return res.status(403).json({ message: 'Admins cannot deactivate other Admins' });
    }

    await pool.query(
      'UPDATE company_users SET is_active = $1 WHERE company_id = $2 AND user_id = $3',
      [is_active, company_id, target_user_id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'TOGGLE_USER_STATUS', 'company_users', target_user_id, JSON.stringify({ is_active })]
    );

    res.json({ message: `User status set to ${is_active ? 'active' : 'inactive'} successfully` });
  } catch (err) {
    console.error('[SettingsController] toggleCompanyUserStatus error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Invoice Settings: Fetch
 */
const getInvoiceSettings = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant', 'viewer']);

    const settingsRes = await pool.query(
      'SELECT * FROM invoice_settings WHERE company_id = $1',
      [company_id]
    );

    if (settingsRes.rows.length === 0) {
      // Seed default settings on the fly
      const seed = await pool.query(
        `INSERT INTO invoice_settings (company_id) VALUES ($1) RETURNING *`,
        [company_id]
      );
      return res.json({ settings: seed.rows[0] });
    }

    res.json({ settings: settingsRes.rows[0] });
  } catch (err) {
    console.error('[SettingsController] getInvoiceSettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Invoice Settings: Update
 */
const updateInvoiceSettings = async (req, res) => {
  const { company_id, auto_numbering_prefix, auto_numbering_start, template_preset, default_payment_terms } = req.body;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    const result = await pool.query(
      `INSERT INTO invoice_settings (company_id, auto_numbering_prefix, auto_numbering_start, template_preset, default_payment_terms)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id)
       DO UPDATE SET auto_numbering_prefix = $2, auto_numbering_start = $3, template_preset = $4, default_payment_terms = $5, updated_at = NOW()
       RETURNING *`,
      [company_id, auto_numbering_prefix || 'INV-', auto_numbering_start || 1, template_preset || 'classic', default_payment_terms || 'net_30']
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'UPDATE_INVOICE_SETTINGS', 'invoice_settings', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Invoice settings saved successfully', settings: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] updateInvoiceSettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Tax Settings: Fetch all rates
 */
const getTaxSettings = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant', 'viewer']);

    const taxRes = await pool.query('SELECT * FROM tax_settings WHERE company_id = $1 ORDER BY percentage ASC', [company_id]);
    res.json({ taxes: taxRes.rows });
  } catch (err) {
    console.error('[SettingsController] getTaxSettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Tax Settings: Create rate
 */
const createTaxRate = async (req, res) => {
  const { company_id, name, percentage, is_default } = req.body;
  const userId = req.user.id;

  if (!company_id || !name || percentage === undefined) {
    return res.status(400).json({ message: 'company_id, name, and percentage are required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    if (is_default) {
      // Clear previous default
      await pool.query('UPDATE tax_settings SET is_default = FALSE WHERE company_id = $1', [company_id]);
    }

    const result = await pool.query(
      `INSERT INTO tax_settings (company_id, name, percentage, is_default)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company_id, name, percentage, is_default || false]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'CREATE_TAX_RATE', 'tax_settings', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json({ message: 'Tax rate created successfully', tax: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] createTaxRate error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Tax Settings: Update rate
 */
const updateTaxRate = async (req, res) => {
  const taxId = req.params.id;
  const { company_id, name, percentage, is_default } = req.body;
  const userId = req.user.id;

  if (!company_id || !name || percentage === undefined) {
    return res.status(400).json({ message: 'company_id, name, and percentage are required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    if (is_default) {
      // Clear previous default
      await pool.query('UPDATE tax_settings SET is_default = FALSE WHERE company_id = $1', [company_id]);
    }

    const result = await pool.query(
      `UPDATE tax_settings 
       SET name = $1, percentage = $2, is_default = $3, updated_at = NOW()
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [name, percentage, is_default, taxId, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tax rate not found' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'UPDATE_TAX_RATE', 'tax_settings', taxId, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Tax rate updated successfully', tax: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] updateTaxRate error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Tax Settings: Delete rate
 */
const deleteTaxRate = async (req, res) => {
  const taxId = req.params.id;
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id parameter is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    const result = await pool.query(
      'DELETE FROM tax_settings WHERE id = $1 AND company_id = $2 RETURNING *',
      [taxId, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tax rate not found' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [company_id, userId, 'DELETE_TAX_RATE', 'tax_settings', taxId]
    );

    res.json({ message: 'Tax rate deleted successfully' });
  } catch (err) {
    console.error('[SettingsController] deleteTaxRate error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Notifications: Fetch toggles
 */
const getNotificationSettings = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant', 'viewer']);

    const notifyRes = await pool.query(
      'SELECT * FROM notification_settings WHERE company_id = $1',
      [company_id]
    );

    if (notifyRes.rows.length === 0) {
      const seed = await pool.query(
        `INSERT INTO notification_settings (company_id) VALUES ($1) RETURNING *`,
        [company_id]
      );
      return res.json({ notifications: seed.rows[0] });
    }

    res.json({ notifications: notifyRes.rows[0] });
  } catch (err) {
    console.error('[SettingsController] getNotificationSettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Notifications: Update toggles
 */
const updateNotificationSettings = async (req, res) => {
  const { company_id, invoice_sent, payment_received, overdue_reminder } = req.body;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin']);

    const result = await pool.query(
      `INSERT INTO notification_settings (company_id, invoice_sent, payment_received, overdue_reminder)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id)
       DO UPDATE SET invoice_sent = $2, payment_received = $3, overdue_reminder = $4, updated_at = NOW()
       RETURNING *`,
      [company_id, invoice_sent, payment_received, overdue_reminder]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company_id, userId, 'UPDATE_NOTIFICATION_SETTINGS', 'notification_settings', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Notification settings updated successfully', notifications: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] updateNotificationSettings error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Profile Settings: Update User Name
 */
const updateUserProfile = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email',
      [name.trim(), userId]
    );

    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('[SettingsController] updateUserProfile error:', err);
    res.status(500).json({ message: 'Error updating user profile' });
  }
};

/**
 * Profile Settings: Change Password
 */
const changeUserPassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.user.id;

  if (!old_password || !new_password) {
    return res.status(400).json({ message: 'Old password and new password are required' });
  }

  try {
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    const match = await bcrypt.compare(old_password, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[SettingsController] changeUserPassword error:', err);
    res.status(500).json({ message: 'Error changing password' });
  }
};

/**
 * Audit Logs: Retrieve history logs
 */
const getAuditLogs = async (req, res) => {
  const { company_id, page = 1, limit = 20 } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const offset = (page - 1) * limit;

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant', 'viewer']);

    const countRes = await pool.query('SELECT COUNT(*) FROM audit_logs WHERE company_id = $1', [company_id]);
    const total = parseInt(countRes.rows[0].count, 10);

    const logsRes = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.company_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [company_id, limit, offset]
    );

    res.json({
      logs: logsRes.rows,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
      totalRecords: total
    });
  } catch (err) {
    console.error('[SettingsController] getAuditLogs error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Data Export: Generate CSV download of transaction vouchers
 */
const exportTransactionsCSV = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    await checkCompanyAccess(company_id, userId, ['owner', 'admin', 'accountant']);

    // Fetch double entry voucher logs
    const result = await pool.query(
      `SELECT v.id as voucher_id, v.voucher_number, v.voucher_type, v.voucher_date as date, v.narration,
              ve.id as entry_id, l.name as ledger_name, ve.debit_amount, ve.credit_amount
       FROM vouchers v
       JOIN voucher_entries ve ON v.id = ve.voucher_id
       JOIN ledgers l ON ve.ledger_id = l.id
       WHERE v.company_id = $1
       ORDER BY v.voucher_date DESC, v.voucher_number DESC, ve.id ASC`,
      [company_id]
    );

    // Build CSV string
    let csv = 'Voucher ID,Voucher Number,Voucher Type,Date,Narration,Ledger Name,Entry Type,Amount\n';
    result.rows.forEach(row => {
      const escape = (val) => val ? `"${String(val).replace(/"/g, '""')}"` : '""';
      const formattedDate = row.date ? new Date(row.date).toISOString().split('T')[0] : '';
      const entryType = parseFloat(row.debit_amount) > 0 ? 'debit' : 'credit';
      const amount = parseFloat(row.debit_amount) > 0 ? row.debit_amount : row.credit_amount;
      csv += `${escape(row.voucher_id)},${escape(row.voucher_number)},${escape(row.voucher_type)},${escape(formattedDate)},${escape(row.narration)},${escape(row.ledger_name)},${escape(entryType)},${amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${company_id}.csv`);
    res.send(csv);

  } catch (err) {
    console.error('[SettingsController] exportTransactionsCSV error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  updateCompanySettings,
  getLockStatus,
  releaseLock,
  getCompanyUsers,
  inviteCompanyUser,
  updateCompanyUserRole,
  toggleCompanyUserStatus,
  getInvoiceSettings,
  updateInvoiceSettings,
  getTaxSettings,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  getNotificationSettings,
  updateNotificationSettings,
  updateUserProfile,
  changeUserPassword,
  getAuditLogs,
  exportTransactionsCSV
};
