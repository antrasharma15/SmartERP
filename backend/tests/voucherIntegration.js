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
  const testEmail = `voucheruser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Voucher Test User`;
  let cookieHeader = '';
  let companyId = '';

  // Master records IDs
  let supplierLedgerId = '';
  let purchaseLedgerId = '';
  let cgstLedgerId = '';
  let sgstLedgerId = '';
  let ipadItemId = '';
  let voucherId = '';

  console.log(`========================================`);
  console.log(`Running Voucher API Integration Tests`);
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
      name: `Voucher Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Company created successfully', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 2. Setup Ledger Accounts
    console.log('\nStep 2: Creating ledger accounts...');
    // Create Supplier Ledger
    const supplierRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Acme Distributors',
      ledger_type: 'supplier',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    assert('Supplier ledger created', supplierRes.status === 201, supplierRes);
    if (supplierRes.body && supplierRes.body.ledger) supplierLedgerId = supplierRes.body.ledger.id;

    // Create Purchase Ledger
    const purchaseRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Purchase Account',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Purchase ledger created', purchaseRes.status === 201, purchaseRes);
    if (purchaseRes.body && purchaseRes.body.ledger) purchaseLedgerId = purchaseRes.body.ledger.id;

    // Create CGST Ledger
    const cgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Input CGST',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('CGST ledger created', cgstRes.status === 201, cgstRes);
    if (cgstRes.body && cgstRes.body.ledger) cgstLedgerId = cgstRes.body.ledger.id;

    // Create SGST Ledger
    const sgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Input SGST',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('SGST ledger created', sgstRes.status === 201, sgstRes);
    if (sgstRes.body && sgstRes.body.ledger) sgstLedgerId = sgstRes.body.ledger.id;

    // 3. Setup Stock Item
    console.log('\nStep 3: Creating stock item...');
    const itemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Apple iPad Air',
      sku: 'IPAD-AIR-10',
      purchase_price: 400.00,
      selling_price: 499.00,
      gst_percentage: 18.00,
      quantity: 0
    }, { Cookie: cookieHeader });
    assert('Stock item created', itemRes.status === 201, itemRes);
    if (itemRes.body && itemRes.body.item) ipadItemId = itemRes.body.item.id;

    // 4. Create Purchase Voucher
    console.log('\nStep 4: Posting Purchase Voucher...');
    const voucherPayload = {
      company_id: companyId,
      voucher_type: 'purchase',
      voucher_date: '2026-06-28',
      reference: 'ACME-9912',
      narration: 'Purchased 10 iPads on credit',
      party_ledger_id: supplierLedgerId,
      purchase_ledger_id: purchaseLedgerId,
      items: [
        {
          stock_item_id: ipadItemId,
          quantity: 10,
          rate: 450.00
        }
      ],
      tax_entries: [
        { ledger_id: cgstLedgerId, amount: 405.00 },
        { ledger_id: sgstLedgerId, amount: 405.00 }
      ]
    };

    const pvCreateRes = await request('/vouchers', 'POST', voucherPayload, { Cookie: cookieHeader });
    assert('Create voucher returns 201', pvCreateRes.status === 201, pvCreateRes);
    assert('Voucher number generated dynamically', pvCreateRes.body && pvCreateRes.body.voucher_number === 'PUR-1', pvCreateRes.body);
    if (pvCreateRes.body && pvCreateRes.body.voucher) voucherId = pvCreateRes.body.voucher.id;

    // 5. Verify Ledger Double-Entry postings
    console.log('\nStep 5: Verifying general ledger entries...');
    const getVoucherRes = await request(`/vouchers/${voucherId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Load voucher details returns 200', getVoucherRes.status === 200, getVoucherRes);
    
    if (getVoucherRes.body && getVoucherRes.body.voucher) {
      const v = getVoucherRes.body.voucher;
      assert('Contains 4 accounting postings', v.entries && v.entries.length === 4, v.entries);
      
      const partyEntry = v.entries.find(e => e.ledger_id === supplierLedgerId);
      assert('Credit entry on supplier ledger matches total payable ($5310)', partyEntry && parseFloat(partyEntry.credit_amount) === 5310.00, partyEntry);

      const purchaseEntry = v.entries.find(e => e.ledger_id === purchaseLedgerId);
      assert('Debit entry on purchase ledger matches items cost ($4500)', purchaseEntry && parseFloat(purchaseEntry.debit_amount) === 4500.00, purchaseEntry);

      const cgstEntry = v.entries.find(e => e.ledger_id === cgstLedgerId);
      assert('Debit entry on CGST ledger matches ($405)', cgstEntry && parseFloat(cgstEntry.debit_amount) === 405.00, cgstEntry);
    }

    // 6. Verify Stock Auto-Increment
    console.log('\nStep 6: Verifying auto-increment of physical stock...');
    const getItemsRes = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Load stock items list returns 200', getItemsRes.status === 200, getItemsRes);
    if (getItemsRes.body && getItemsRes.body.items) {
      const ipad = getItemsRes.body.items.find(i => i.id === ipadItemId);
      assert('iPad quantity increased to 10', ipad && parseFloat(ipad.quantity) === 10.00, ipad);
    }

    // 7. Delete Voucher & Rollback Stock
    console.log('\nStep 7: Voiding voucher and checking stock levels rollback...');
    const delVoucherRes = await request(`/vouchers/${voucherId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete voucher returns 200', delVoucherRes.status === 200, delVoucherRes);

    const getItemsRollbackRes = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (getItemsRollbackRes.body && getItemsRollbackRes.body.items) {
      const ipad = getItemsRollbackRes.body.items.find(i => i.id === ipadItemId);
      assert('iPad quantity rolled back to 0', ipad && parseFloat(ipad.quantity) === 0.00, ipad);
    }

    // 8. Verify Voucher deleted
    console.log('\nStep 8: Verifying ledger entries deleted...');
    const getVoucherDeletedRes = await request(`/vouchers/${voucherId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Fetch deleted voucher returns 404', getVoucherDeletedRes.status === 404, getVoucherDeletedRes);

  } catch (err) {
    console.error('Test run failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL VOUCHER TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
