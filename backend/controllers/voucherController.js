const VoucherModel = require('../models/VoucherModel');

/**
 * List vouchers for a company.
 * Query: company_id, voucher_type
 */
const getVouchers = async (req, res) => {
  const { company_id, voucher_type } = req.query;
  const userId = req.user.id;

  console.log(`[VoucherController] GET /api/vouchers - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id query parameter is required' });
  }

  try {
    const vouchers = await VoucherModel.getVouchersByCompanyId(userId, company_id, { voucher_type });
    res.json({ vouchers });
  } catch (err) {
    console.error(`[VoucherController Error] Error listing vouchers:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error listing vouchers', error: err.message });
  }
};

/**
 * Fetch detail of a single voucher.
 */
const getVoucher = async (req, res) => {
  const voucherId = req.params.id;
  const userId = req.user.id;

  console.log(`[VoucherController] GET /api/vouchers/${voucherId} - User:`, userId);

  try {
    const voucher = await VoucherModel.getVoucherById(userId, voucherId);
    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }
    res.json({ voucher });
  } catch (err) {
    console.error(`[VoucherController Error] Error loading voucher ID ${voucherId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error loading voucher details', error: err.message });
  }
};

/**
 * Create a new voucher.
 */
const createVoucher = async (req, res) => {
  const userId = req.user.id;
  const {
    company_id,
    voucher_type,
    voucher_date,
    reference,
    narration,
    party_ledger_id,
    purchase_ledger_id,
    items,
    tax_entries
  } = req.body;

  console.log(`[VoucherController] POST /api/vouchers - Body:`, req.body, `User:`, userId);

  if (!company_id) return res.status(400).json({ message: 'company_id is required' });
  if (!voucher_type) return res.status(400).json({ message: 'voucher_type is required' });
  if (voucher_type !== 'purchase') {
    return res.status(400).json({ message: 'Only purchase vouchers are supported at this time' });
  }

  try {
    const result = await VoucherModel.createPurchaseVoucher(userId, company_id, {
      voucher_date,
      reference,
      narration,
      party_ledger_id,
      purchase_ledger_id,
      items,
      tax_entries
    });
    res.status(201).json({
      message: 'Purchase voucher created successfully',
      voucher: result.voucher,
      voucher_number: result.voucherNumber
    });
  } catch (err) {
    console.error(`[VoucherController Error] Error creating purchase voucher:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (
      err.message.includes('required') || 
      err.message.includes('must be greater than zero') ||
      err.message.includes('not found') ||
      err.message.includes('same company')
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating voucher', error: err.message });
  }
};

/**
 * Delete a voucher.
 */
const deleteVoucher = async (req, res) => {
  const voucherId = req.params.id;
  const userId = req.user.id;

  console.log(`[VoucherController] DELETE /api/vouchers/${voucherId} - User:`, userId);

  try {
    const result = await VoucherModel.deleteVoucher(userId, voucherId);
    res.json({ message: 'Voucher deleted successfully', voucher: result });
  } catch (err) {
    console.error(`[VoucherController Error] Error deleting voucher ID ${voucherId}:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error deleting voucher', error: err.message });
  }
};

module.exports = {
  getVouchers,
  getVoucher,
  createVoucher,
  deleteVoucher
};
