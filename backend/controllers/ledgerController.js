const LedgerModel = require('../models/LedgerModel');

/**
 * Handle listing all ledgers.
 * Expects company_id in query params.
 */
const getLedgers = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  console.log(`[LedgerController] GET /api/ledgers - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    console.warn(`[LedgerController Warning] Missing company_id query parameter.`);
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const ledgers = await LedgerModel.getLedgersByCompanyId(userId, company_id);
    res.json({ ledgers });
  } catch (err) {
    console.error(`[LedgerController Error] Error listing ledgers:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing ledgers', error: err.message });
  }
};

/**
 * Handle listing all groups for a company.
 * Expects company_id in query params.
 */
const getGroups = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  console.log(`[LedgerController] GET /api/ledgers/groups - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    console.warn(`[LedgerController Warning] Missing company_id query parameter for groups.`);
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const groups = await LedgerModel.getGroupsByCompanyId(userId, company_id);
    res.json({ groups });
  } catch (err) {
    console.error(`[LedgerController Error] Error listing groups:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing groups', error: err.message });
  }
};

/**
 * Handle creating a new ledger.
 */
const createLedger = async (req, res) => {
  const userId = req.user.id;
  const { company_id, name, group_id, ledger_type, opening_balance, opening_balance_type } = req.body;

  console.log(`[LedgerController] POST /api/ledgers - Body:`, req.body, `User:`, userId);

  if (!company_id) {
    console.warn(`[LedgerController Warning] Missing company_id in request body.`);
    return res.status(400).json({ message: 'company_id is required' });
  }

  if (!name || name.trim() === '') {
    console.warn(`[LedgerController Warning] Missing name in request body.`);
    return res.status(400).json({ message: 'Ledger name is required' });
  }

  if (!ledger_type || ledger_type.trim() === '') {
    console.warn(`[LedgerController Warning] Missing ledger_type in request body.`);
    return res.status(400).json({ message: 'Ledger type is required' });
  }

  try {
    const ledger = await LedgerModel.createLedger(userId, company_id, {
      name,
      group_id,
      ledger_type,
      opening_balance,
      opening_balance_type
    });
    res.status(201).json({ message: 'Ledger created successfully', ledger });
  } catch (err) {
    console.error(`[LedgerController Error] Error creating ledger:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('already exists') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating ledger', error: err.message });
  }
};

/**
 * Handle fetching details of a ledger.
 */
const getLedger = async (req, res) => {
  const ledgerId = req.params.id;
  const userId = req.user.id;

  console.log(`[LedgerController] GET /api/ledgers/${ledgerId} - User:`, userId);

  try {
    const ledger = await LedgerModel.getLedgerById(userId, ledgerId);
    if (!ledger) {
      console.warn(`[LedgerController Warning] Ledger ${ledgerId} not found.`);
      return res.status(404).json({ message: 'Ledger not found' });
    }
    res.json({ ledger });
  } catch (err) {
    console.error(`[LedgerController Error] Error getting ledger detail for ID ${ledgerId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error retrieving ledger details', error: err.message });
  }
};

/**
 * Handle updating a ledger.
 */
const updateLedger = async (req, res) => {
  const ledgerId = req.params.id;
  const userId = req.user.id;
  const { name, group_id, ledger_type, opening_balance, opening_balance_type } = req.body;

  console.log(`[LedgerController] PUT /api/ledgers/${ledgerId} - Body:`, req.body, `User:`, userId);

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Ledger name is required' });
  }

  if (!ledger_type || ledger_type.trim() === '') {
    return res.status(400).json({ message: 'Ledger type is required' });
  }

  try {
    const ledger = await LedgerModel.updateLedger(userId, ledgerId, {
      name,
      group_id,
      ledger_type,
      opening_balance,
      opening_balance_type
    });
    res.json({ message: 'Ledger updated successfully', ledger });
  } catch (err) {
    console.error(`[LedgerController Error] Error updating ledger ID ${ledgerId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('already exists') || err.message.includes('not found')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating ledger', error: err.message });
  }
};

/**
 * Handle deleting a ledger.
 */
const deleteLedger = async (req, res) => {
  const ledgerId = req.params.id;
  const userId = req.user.id;

  console.log(`[LedgerController] DELETE /api/ledgers/${ledgerId} - User:`, userId);

  try {
    const ledger = await LedgerModel.deleteLedger(userId, ledgerId);
    res.json({ message: 'Ledger deleted successfully', ledger });
  } catch (err) {
    console.error(`[LedgerController Error] Error deleting ledger ID ${ledgerId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting ledger', error: err.message });
  }
};

module.exports = {
  getLedgers,
  getGroups,
  createLedger,
  getLedger,
  updateLedger,
  deleteLedger
};
