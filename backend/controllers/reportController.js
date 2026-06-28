const ReportModel = require('../models/ReportModel');

const getTrialBalanceReport = async (req, res) => {
  const { company_id, start_date, end_date } = req.query;
  const userId = req.user.id;

  console.log(`[ReportController] GET /api/reports/trial-balance - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  // Default range fallback (April 1, 2026 to March 31, 2027)
  const start = start_date || '2026-04-01';
  const end = end_date || '2027-03-31';

  try {
    const report = await ReportModel.getTrialBalance(userId, company_id, start, end);
    res.json({ report });
  } catch (err) {
    console.error(`[ReportController Error] Trial balance failed:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error generating trial balance report', error: err.message }); // wait typo: status(5500) -> status(500)
  }
};

const getProfitAndLossReport = async (req, res) => {
  const { company_id, start_date, end_date } = req.query;
  const userId = req.user.id;

  console.log(`[ReportController] GET /api/reports/profit-loss - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const start = start_date || '2026-04-01';
  const end = end_date || '2027-03-31';

  try {
    const report = await ReportModel.getProfitAndLoss(userId, company_id, start, end);
    res.json({ report });
  } catch (err) {
    console.error(`[ReportController Error] P&L failed:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error generating profit & loss report', error: err.message });
  }
};

const getBalanceSheetReport = async (req, res) => {
  const { company_id, start_date, end_date } = req.query;
  const userId = req.user.id;

  console.log(`[ReportController] GET /api/reports/balance-sheet - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const start = start_date || '2026-04-01';
  const end = end_date || '2027-03-31';

  try {
    const report = await ReportModel.getBalanceSheet(userId, company_id, start, end);
    res.json({ report });
  } catch (err) {
    console.error(`[ReportController Error] Balance sheet failed:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error generating balance sheet report', error: err.message });
  }
};

const getDayBookReport = async (req, res) => {
  const { company_id, start_date, end_date } = req.query;
  const userId = req.user.id;

  console.log(`[ReportController] GET /api/reports/day-book - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  const start = start_date || '2026-04-01';
  const end = end_date || '2027-03-31';

  try {
    const report = await ReportModel.getDayBook(userId, company_id, start, end);
    res.json({ report });
  } catch (err) {
    console.error(`[ReportController Error] Day book failed:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error generating day book report', error: err.message });
  }
};

const getStockSummaryReport = async (req, res) => {
  const { company_id } = req.query;
  const userId = req.user.id;

  console.log(`[ReportController] GET /api/reports/stock-summary - Query:`, req.query, `User:`, userId);

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    const report = await ReportModel.getStockSummary(userId, company_id);
    res.json({ report });
  } catch (err) {
    console.error(`[ReportController Error] Stock summary failed:`, err);
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error generating stock summary report', error: err.message });
  }
};

module.exports = {
  getTrialBalanceReport,
  getProfitAndLossReport,
  getBalanceSheetReport,
  getDayBookReport,
  getStockSummaryReport
};
