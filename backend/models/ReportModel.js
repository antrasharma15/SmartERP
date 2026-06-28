const pool = require('../config/db');

/**
 * Check company access for user.
 */
const checkUserCompanyAccess = async (companyId, userId) => {
  console.log(`[ReportModel Debug] Verifying company access. companyId: ${companyId}, userId: ${userId}`);
  const result = await pool.query(
    `SELECT role FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Computes Trial Balance ledger balances for a company in a date range.
 * This is the master calculation function used by Trial Balance, P&L, and Balance Sheet.
 */
const getLedgerBalances = async (companyId, startDate, endDate) => {
  console.log(`[ReportModel Debug] Calculating ledger balances for company ${companyId} from ${startDate} to ${endDate}`);
  
  const query = `
    WITH pre_tx AS (
      SELECT 
        ve.ledger_id,
        COALESCE(SUM(ve.debit_amount), 0) as debits,
        COALESCE(SUM(ve.credit_amount), 0) as credits
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE v.company_id = $1 AND v.voucher_date < $2
      GROUP BY ve.ledger_id
    ),
    range_tx AS (
      SELECT 
        ve.ledger_id,
        COALESCE(SUM(ve.debit_amount), 0) as debits,
        COALESCE(SUM(ve.credit_amount), 0) as credits
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE v.company_id = $1 AND v.voucher_date BETWEEN $2 AND $3
      GROUP BY ve.ledger_id
    )
    SELECT 
      l.id as ledger_id,
      l.name as ledger_name,
      l.ledger_type,
      l.opening_balance,
      l.opening_balance_type,
      g.name as group_name,
      g.type as group_type,
      COALESCE(p.debits, 0) as pre_debit,
      COALESCE(p.credits, 0) as pre_credit,
      COALESCE(r.debits, 0) as range_debit,
      COALESCE(r.credits, 0) as range_credit
    FROM ledgers l
    LEFT JOIN groups g ON l.group_id = g.id
    LEFT JOIN pre_tx p ON p.ledger_id = l.id
    LEFT JOIN range_tx r ON r.ledger_id = l.id
    WHERE l.company_id = $1
    ORDER BY l.name ASC
  `;

  try {
    const res = await pool.query(query, [companyId, startDate, endDate]);
    console.log(`[ReportModel Debug] Fetched ${res.rows.length} ledgers. Processing mathematical balances...`);

    const ledgerBalances = res.rows.map(row => {
      const openingBalance = parseFloat(row.opening_balance) || 0;
      const preDebit = parseFloat(row.pre_debit) || 0;
      const preCredit = parseFloat(row.pre_credit) || 0;
      const rangeDebit = parseFloat(row.range_debit) || 0;
      const rangeCredit = parseFloat(row.range_credit) || 0;

      // Determine normal balance type
      const isDebitNormal = 
        ['customer', 'bank', 'expense'].includes(row.ledger_type) || 
        ['asset', 'expense'].includes(row.group_type);

      // Compute opening balance at range start
      let rangeOpening = 0;
      let rangeOpeningType = 'dr';

      // Start with initial opening balance
      const initialDr = row.opening_balance_type === 'dr' ? openingBalance : 0;
      const initialCr = row.opening_balance_type === 'cr' ? openingBalance : 0;

      // Total running balance before start date
      const netDr = initialDr + preDebit;
      const netCr = initialCr + preCredit;

      if (isDebitNormal) {
        rangeOpening = netDr - netCr;
        rangeOpeningType = rangeOpening >= 0 ? 'dr' : 'cr';
        rangeOpening = Math.abs(rangeOpening);
      } else {
        rangeOpening = netCr - netDr;
        rangeOpeningType = rangeOpening >= 0 ? 'cr' : 'dr';
        rangeOpening = Math.abs(rangeOpening);
      }

      // Compute closing balance at range end
      let rangeClosing = 0;
      let rangeClosingType = 'dr';

      const totalDr = initialDr + preDebit + rangeDebit;
      const totalCr = initialCr + preCredit + rangeCredit;

      if (isDebitNormal) {
        rangeClosing = totalDr - totalCr;
        rangeClosingType = rangeClosing >= 0 ? 'dr' : 'cr';
        rangeClosing = Math.abs(rangeClosing);
      } else {
        rangeClosing = totalCr - totalDr;
        rangeClosingType = rangeClosing >= 0 ? 'cr' : 'dr';
        rangeClosing = Math.abs(rangeClosing);
      }

      return {
        ledger_id: row.ledger_id,
        ledger_name: row.ledger_name,
        ledger_type: row.ledger_type,
        group_name: row.group_name || 'N/A',
        group_type: row.group_type || 'N/A',
        opening_balance: rangeOpening,
        opening_balance_type: rangeOpeningType,
        debit_total: rangeDebit,
        credit_total: rangeCredit,
        closing_balance: rangeClosing,
        closing_balance_type: rangeClosingType
      };
    });

    return ledgerBalances;
  } catch (err) {
    console.error(`[ReportModel Error] Failed to compute ledger balances:`, err);
    throw err;
  }
};

/**
 * Generates Trial Balance report.
 */
const getTrialBalance = async (userId, companyId, startDate, endDate) => {
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

  console.log(`[ReportModel Debug] Running Trial Balance audit query...`);
  const balances = await getLedgerBalances(companyId, startDate, endDate);

  let totalOpeningDr = 0;
  let totalOpeningCr = 0;
  let totalDebitMovements = 0;
  let totalCreditMovements = 0;
  let totalClosingDr = 0;
  let totalClosingCr = 0;

  balances.forEach(b => {
    if (b.opening_balance_type === 'dr') totalOpeningDr += b.opening_balance;
    else totalOpeningCr += b.opening_balance;

    totalDebitMovements += b.debit_total;
    totalCreditMovements += b.credit_total;

    if (b.closing_balance_type === 'dr') totalClosingDr += b.closing_balance;
    else totalClosingCr += b.closing_balance;
  });

  return {
    rows: balances,
    totals: {
      opening_debit: totalOpeningDr,
      opening_credit: totalOpeningCr,
      debit_movements: totalDebitMovements,
      credit_movements: totalCreditMovements,
      closing_debit: totalClosingDr,
      closing_credit: totalClosingCr
    }
  };
};

/**
 * Generates Profit & Loss Statement.
 */
const getProfitAndLoss = async (userId, companyId, startDate, endDate) => {
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

  console.log(`[ReportModel Debug] Running Profit & Loss query...`);
  const balances = await getLedgerBalances(companyId, startDate, endDate);

  const revenueItems = [];
  const expenseItems = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  balances.forEach(b => {
    const isIncome = b.ledger_type === 'income' || b.group_type === 'income';
    const isExpense = b.ledger_type === 'expense' || b.group_type === 'expense';

    // Account normal signs
    const balVal = b.closing_balance_type === 'cr' && isIncome ? b.closing_balance : -b.closing_balance;
    const expVal = b.closing_balance_type === 'dr' && isExpense ? b.closing_balance : -b.closing_balance;

    if (isIncome) {
      const val = Math.abs(balVal);
      if (val > 0) {
        revenueItems.push({ name: b.ledger_name, amount: val });
        totalRevenue += val;
      }
    } else if (isExpense) {
      const val = Math.abs(expVal);
      if (val > 0) {
        expenseItems.push({ name: b.ledger_name, amount: val });
        totalExpenses += val;
      }
    }
  });

  const netProfit = totalRevenue - totalExpenses;

  return {
    revenue: revenueItems,
    expenses: expenseItems,
    totals: {
      revenue_total: totalRevenue,
      expense_total: totalExpenses,
      net_profit: netProfit
    }
  };
};

/**
 * Generates Balance Sheet.
 */
const getBalanceSheet = async (userId, companyId, startDate, endDate) => {
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

  console.log(`[ReportModel Debug] Running Balance Sheet query...`);
  const balances = await getLedgerBalances(companyId, startDate, endDate);

  const assetItems = [];
  const liabilityItems = [];
  let totalAssets = 0;
  let totalLiabilities = 0;

  balances.forEach(b => {
    const isAsset = ['customer', 'bank'].includes(b.ledger_type) || b.group_type === 'asset';
    const isLiability = ['supplier'].includes(b.ledger_type) || b.group_type === 'liability';

    if (isAsset) {
      const val = b.closing_balance_type === 'dr' ? b.closing_balance : -b.closing_balance;
      if (Math.abs(val) > 0) {
        assetItems.push({ name: b.ledger_name, amount: val });
        totalAssets += val;
      }
    } else if (isLiability) {
      const val = b.closing_balance_type === 'cr' ? b.closing_balance : -b.closing_balance;
      if (Math.abs(val) > 0) {
        liabilityItems.push({ name: b.ledger_name, amount: val });
        totalLiabilities += val;
      }
    }
  });

  // Fetch P&L to inject Net Profit into reserves
  const pl = await getProfitAndLoss(userId, companyId, startDate, endDate);
  const netProfit = pl.totals.net_profit;

  // Add net profit to liabilities section as reserves & surplus
  liabilityItems.push({ name: 'Reserves & Surplus (Net Profit)', amount: netProfit });
  totalLiabilities += netProfit;

  return {
    assets: assetItems,
    liabilities: liabilityItems,
    totals: {
      assets_total: totalAssets,
      liabilities_total: totalLiabilities,
      balance_difference: Math.abs(totalAssets - totalLiabilities)
    }
  };
};

/**
 * Generates Day Book report.
 */
const getDayBook = async (userId, companyId, startDate, endDate) => {
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

  console.log(`[ReportModel Debug] Running Day Book transaction log query...`);
  
  const query = `
    SELECT 
      v.id as voucher_id,
      v.voucher_number,
      v.voucher_type,
      v.voucher_date,
      v.reference,
      v.narration,
      COALESCE(SUM(ve.debit_amount), 0) as total_amount
    FROM vouchers v
    LEFT JOIN voucher_entries ve ON ve.voucher_id = v.id
    WHERE v.company_id = $1 AND v.voucher_date BETWEEN $2 AND $3
    GROUP BY v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.reference, v.narration
    ORDER BY v.voucher_date DESC, v.created_at DESC
  `;

  try {
    const res = await pool.query(query, [companyId, startDate, endDate]);
    return res.rows;
  } catch (err) {
    console.error(`[ReportModel Error] Day Book execution failed:`, err);
    throw err;
  }
};

/**
 * Generates Stock Summary valuation.
 */
const getStockSummary = async (userId, companyId) => {
  const hasAccess = await checkUserCompanyAccess(companyId, userId);
  if (!hasAccess) throw new Error('Unauthorized: You do not have access to this company');

  console.log(`[ReportModel Debug] Running Stock summary valuation query...`);
  
  const query = `
    SELECT 
      si.id,
      si.name,
      si.sku,
      si.purchase_price,
      si.selling_price,
      si.gst_percentage,
      si.quantity,
      (si.quantity * si.purchase_price) as valuation
    FROM stock_items si
    WHERE si.company_id = $1
    ORDER BY si.name ASC
  `;

  try {
    const res = await pool.query(query, [companyId]);
    
    let totalItems = 0;
    let totalQty = 0;
    let totalValuation = 0;

    res.rows.forEach(item => {
      totalItems += 1;
      totalQty += parseFloat(item.quantity) || 0;
      totalValuation += parseFloat(item.valuation) || 0;
    });

    return {
      items: res.rows,
      totals: {
        total_items: totalItems,
        total_quantity: totalQty,
        total_valuation: totalValuation
      }
    };
  } catch (err) {
    console.error(`[ReportModel Error] Stock summary query failed:`, err);
    throw err;
  }
};

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getDayBook,
  getStockSummary
};
