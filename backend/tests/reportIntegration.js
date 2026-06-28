const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  const suffix = Date.now();
  const testEmail = `reportuser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Report Test User`;
  let cookieHeader = '';
  let companyId = '';

  // Master records IDs
  let supplierLedgerId = '';
  let customerLedgerId = '';
  let purchaseLedgerId = '';
  let salesLedgerId = '';
  let rentLedgerId = '';
  let keyboardItemId = '';

  console.log(`========================================`);
  console.log(`Running Reports Module API Integration Tests`);
  console.log(`========================================\n`);

  let failures = 0;

  const assert = (name, condition, details) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} - Details:`, details);
      failures++;
    }
  };

  try {
    // 1. Auth & Company
    const regRes = await request('/auth/register', 'POST', {
      name: testName,
      email: testEmail,
      password: testPassword
    });
    assert('Register returns 201', regRes.status === 201, regRes);

    const loginRes = await request('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword
    });
    assert('Login returns 200', loginRes.status === 200, loginRes);
    if (loginRes.headers['set-cookie']) {
      cookieHeader = loginRes.headers['set-cookie'][0].split(';')[0];
    }

    const compRes = await request('/companies', 'POST', {
      name: `Report Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Company created successfully', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 2. Setup Ledger Accounts (Asset, Liability, Income, Expense)
    console.log('\nStep 2: Creating ledger accounts...');
    
    // Capital Account (Equity/Liability, Opening balance = 1000 CR)
    const capitalRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Owner Capital A/c',
      ledger_type: 'supplier', // maps as liability
      opening_balance: 1000,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    assert('Capital Account created', capitalRes.status === 201, capitalRes);

    // Bank Account (Asset, Opening balance = 1000 DR)
    const bankRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'SBI Current Account',
      ledger_type: 'bank', // maps as asset
      opening_balance: 1000,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Bank Account created', bankRes.status === 201, bankRes);

    // Supplier Ledger (Global Keyboards)
    const supplierRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Global Keyboards',
      ledger_type: 'supplier',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    if (supplierRes.body && supplierRes.body.ledger) supplierLedgerId = supplierRes.body.ledger.id;

    // Purchase Ledger
    const purchaseRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Purchase Account',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (purchaseRes.body && purchaseRes.body.ledger) purchaseLedgerId = purchaseRes.body.ledger.id;

    // Sales Ledger
    const salesRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Sales Revenue Account',
      ledger_type: 'income',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    if (salesRes.body && salesRes.body.ledger) salesLedgerId = salesRes.body.ledger.id;

    // Customer
    const custRes = await request('/customers', 'POST', {
      company_id: companyId,
      name: 'Zenith Distributors'
    }, { Cookie: cookieHeader });
    if (custRes.body && custRes.body.customer) customerLedgerId = custRes.body.customer.ledger_id;

    // Rent Expense
    const rentRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Office Rent A/c',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (rentRes.body && rentRes.body.ledger) rentLedgerId = rentRes.body.ledger.id;

    // 3. Create Stock Item
    console.log('\nStep 3: Creating stock item...');
    const itemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Mechanical Keyboard',
      sku: 'KBD-99',
      purchase_price: 70.00,
      selling_price: 90.00,
      gst_percentage: 0,
      quantity: 0
    }, { Cookie: cookieHeader });
    if (itemRes.body && itemRes.body.item) keyboardItemId = itemRes.body.item.id;

    // 4. Seed Stock: Purchase 10 Keyboards ($700 total)
    console.log('\nStep 4: Posting Purchase Voucher...');
    const pvPayload = {
      company_id: companyId,
      voucher_type: 'purchase',
      voucher_date: '2026-06-28',
      reference: 'P-100',
      narration: 'Stock purchase',
      party_ledger_id: supplierLedgerId,
      purchase_ledger_id: purchaseLedgerId,
      items: [{ stock_item_id: keyboardItemId, quantity: 10, rate: 70.00 }]
    };
    await request('/vouchers', 'POST', pvPayload, { Cookie: cookieHeader });

    // 5. Post Sales: Sell 4 Keyboards ($360 total)
    console.log('\nStep 5: Posting Sales Voucher...');
    const svPayload = {
      company_id: companyId,
      voucher_type: 'sales',
      voucher_date: '2026-06-28',
      reference: 'S-200',
      narration: 'Sales invoice',
      party_ledger_id: customerLedgerId,
      sales_ledger_id: salesLedgerId,
      items: [{ stock_item_id: keyboardItemId, quantity: 4, rate: 90.00 }]
    };
    await request('/vouchers', 'POST', svPayload, { Cookie: cookieHeader });

    // 6. Post Rent payment of $100 from SBI Bank using Purchase Voucher
    console.log('\nStep 6: Posting Rent Payment via Purchase Voucher...');
    const rentItemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Office Rent Service',
      sku: 'RENT-SRV',
      purchase_price: 100.00,
      selling_price: 0,
      gst_percentage: 0,
      quantity: 0
    }, { Cookie: cookieHeader });
    const rentItemId = rentItemRes.body.item.id;

    const rentPVPayload = {
      company_id: companyId,
      voucher_type: 'purchase',
      voucher_date: '2026-06-28',
      reference: 'RENT-001',
      narration: 'Monthly rent payment',
      party_ledger_id: bankRes.body.ledger.id, // Credits Bank (SBI Cash Out)
      purchase_ledger_id: rentLedgerId, // Debits Rent Expense
      items: [{ stock_item_id: rentItemId, quantity: 1, rate: 100.00 }]
    };
    await request('/vouchers', 'POST', rentPVPayload, { Cookie: cookieHeader });

    // 7. Verify Trial Balance
    console.log('\nStep 7: Verifying Trial Balance Report...');
    const tbRes = await request(`/reports/trial-balance?company_id=${companyId}&start_date=2026-04-01&end_date=2026-06-28`, 'GET', null, { Cookie: cookieHeader });
    assert('Trial Balance API returns 200', tbRes.status === 200, tbRes);
    if (tbRes.body && tbRes.body.report) {
      const { totals, rows } = tbRes.body.report;
      assert('Closing debit total equals closing credit total (tb balance)', parseFloat(totals.closing_debit) === parseFloat(totals.closing_credit), totals);
      assert('Sum of debit movements equals credit movements', parseFloat(totals.debit_movements) === parseFloat(totals.credit_movements), totals);
      console.log(`    Trial Balance Closing Totals: Dr $${totals.closing_debit} | Cr $${totals.closing_credit}`);
    }

    // 8. Verify Profit & Loss Report
    console.log('\nStep 8: Verifying Profit & Loss Report...');
    const plRes = await request(`/reports/profit-loss?company_id=${companyId}&start_date=2026-04-01&end_date=2026-06-28`, 'GET', null, { Cookie: cookieHeader });
    assert('P&L API returns 200', plRes.status === 200, plRes);
    if (plRes.body && plRes.body.report) {
      const { totals } = plRes.body.report;
      // Revenue = $360 (Sales), Expenses = $700 (Purchases COGS check or simple purchase ledger debit) + $100 (Rent)
      // Wait, in standard cash/accrual without inventory COGS adjustment, expense totals = purchase total ($700) + rent ($100) = $800. Net Loss = $360 - $800 = -$440.
      assert('Total Revenue is $360.00', parseFloat(totals.revenue_total) === 360.00, totals);
      assert('Total Expenses is $800.00', parseFloat(totals.expense_total) === 800.00, totals);
      assert('Net Profit matches -$440.00 (loss)', parseFloat(totals.net_profit) === -440.00, totals);
      console.log(`    P&L Net Margin: $${totals.net_profit}`);
    }

    // 9. Verify Balance Sheet
    console.log('\nStep 9: Verifying Balance Sheet Report...');
    const bsRes = await request(`/reports/balance-sheet?company_id=${companyId}&start_date=2026-04-01&end_date=2026-06-28`, 'GET', null, { Cookie: cookieHeader });
    assert('Balance Sheet API returns 200', bsRes.status === 200, bsRes);
    if (bsRes.body && bsRes.body.report) {
      const { totals } = bsRes.body.report;
      // Assets: Bank ($1000 - $100 rent = $900) + Customer ($360) = $1260
      // Liabilities: Capital ($1000) + Supplier ($700) - Net Loss ($440) = $1260
      // Assets ($1260) must equal Liabilities ($1260) -> Difference is 0!
      assert('Assets equal Liabilities (Difference is 0)', parseFloat(totals.balance_difference) === 0, totals);
      assert('Total Assets is $1260.00', parseFloat(totals.assets_total) === 1260.00, totals);
      assert('Total Liabilities is $1260.00', parseFloat(totals.liabilities_total) === 1260.00, totals);
      console.log(`    Balance Sheet: Assets $${totals.assets_total} | Liabilities & Equity $${totals.liabilities_total}`);
    }

    // 10. Verify Day Book
    console.log('\nStep 10: Verifying Day Book Report...');
    const dbRes = await request(`/reports/day-book?company_id=${companyId}&start_date=2026-04-01&end_date=2026-06-28`, 'GET', null, { Cookie: cookieHeader });
    assert('Day Book API returns 200', dbRes.status === 200, dbRes);
    assert('Day Book contains 3 vouchers (Purchase, Sales, Journal)', dbRes.body && dbRes.body.report.length === 3, dbRes.body);

    // 11. Verify Stock Summary
    console.log('\nStep 11: Verifying Stock Summary Report...');
    const ssRes = await request(`/reports/stock-summary?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Stock Summary API returns 200', ssRes.status === 200, ssRes);
    if (ssRes.body && ssRes.body.report) {
      const { totals } = ssRes.body.report;
      assert('Remaining stock count is 7 (6 keyboards + 1 rent service)', parseFloat(totals.total_quantity) === 7, totals);
      assert('Stock Valuation is $520.00 (6 * $70 + 1 * $100)', parseFloat(totals.total_valuation) === 520.00, totals);
      console.log(`    Stock Quantity: ${totals.total_quantity} | Valuation: $${totals.total_valuation}`);
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL REPORTS MODULE INTEGRATION TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
