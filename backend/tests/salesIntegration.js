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
  const testEmail = `salesuser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Sales Test User`;
  let cookieHeader = '';
  let companyId = '';

  // Master records IDs
  let supplierLedgerId = '';
  let customerLedgerId = '';
  let purchaseLedgerId = '';
  let salesLedgerId = '';
  let cgstLedgerId = '';
  let sgstLedgerId = '';
  let laptopItemId = '';
  let purchaseVoucherId = '';
  let salesVoucherId = '';

  console.log(`========================================`);
  console.log(`Running Sales Voucher API Integration Tests`);
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
      name: `Sales Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Company created successfully', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 2. Setup Ledgers
    console.log('\nStep 2: Creating ledger accounts...');
    // Supplier Ledger (for initial stock in purchase)
    const supplierRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Global Suppliers Ltd',
      ledger_type: 'supplier',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    assert('Supplier ledger created', supplierRes.status === 201, supplierRes);
    if (supplierRes.body && supplierRes.body.ledger) supplierLedgerId = supplierRes.body.ledger.id;

    // Customer Ledger
    const customerRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Alpha Retailers',
      ledger_type: 'customer',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Customer ledger created', customerRes.status === 201, customerRes);
    if (customerRes.body && customerRes.body.ledger) customerLedgerId = customerRes.body.ledger.id;

    // Purchase Ledger
    const purchaseRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Purchase Account',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Purchase ledger created', purchaseRes.status === 201, purchaseRes);
    if (purchaseRes.body && purchaseRes.body.ledger) purchaseLedgerId = purchaseRes.body.ledger.id;

    // Sales Ledger
    const salesRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Sales Income Account',
      ledger_type: 'income',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    assert('Sales ledger created', salesRes.status === 201, salesRes);
    if (salesRes.body && salesRes.body.ledger) salesLedgerId = salesRes.body.ledger.id;

    // Output CGST Ledger
    const cgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Output CGST A/c',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (cgstRes.body && cgstRes.body.ledger) cgstLedgerId = cgstRes.body.ledger.id;

    // Output SGST Ledger
    const sgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Output SGST A/c',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (sgstRes.body && sgstRes.body.ledger) sgstLedgerId = sgstRes.body.ledger.id;

    // 3. Create Stock Item
    console.log('\nStep 3: Creating stock item...');
    const itemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Dell Inspiron 15',
      sku: 'DELL-15-INSP',
      purchase_price: 500.00,
      selling_price: 650.00,
      gst_percentage: 18.00,
      quantity: 0
    }, { Cookie: cookieHeader });
    assert('Stock item created', itemRes.status === 201, itemRes);
    if (itemRes.body && itemRes.body.item) laptopItemId = itemRes.body.item.id;

    // 4. Post Purchase to stock up
    console.log('\nStep 4: Posting Purchase Voucher to stock up (10 laptops)...');
    const purchaseVPayload = {
      company_id: companyId,
      voucher_type: 'purchase',
      voucher_date: '2026-06-28',
      reference: 'PUR-IN-011',
      narration: 'Initial stock load via purchase',
      party_ledger_id: supplierLedgerId,
      purchase_ledger_id: purchaseLedgerId,
      items: [{ stock_item_id: laptopItemId, quantity: 10, rate: 500.00 }]
    };
    const pvRes = await request('/vouchers', 'POST', purchaseVPayload, { Cookie: cookieHeader });
    assert('Purchase stock-in success', pvRes.status === 201, pvRes);

    // Verify stock is 10
    const stockRes1 = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (stockRes1.body && stockRes1.body.items) {
      const laptop = stockRes1.body.items.find(i => i.id === laptopItemId);
      assert('Initial stock is 10', laptop && parseFloat(laptop.quantity) === 10, laptop);
    }

    // 5. Post Sales Voucher
    console.log('\nStep 5: Posting Sales Voucher (Selling 4 laptops)...');
    const salesVPayload = {
      company_id: companyId,
      voucher_type: 'sales',
      voucher_date: '2026-06-28',
      reference: 'INV-0012',
      narration: 'Sold 4 laptops to customer on credit',
      party_ledger_id: customerLedgerId,
      sales_ledger_id: salesLedgerId,
      items: [
        {
          stock_item_id: laptopItemId,
          quantity: 4,
          rate: 650.00
        }
      ],
      tax_entries: [
        { ledger_id: cgstLedgerId, amount: 234.00 }, // 9% of 2600
        { ledger_id: sgstLedgerId, amount: 234.00 }  // 9% of 2600
      ]
    };
    const svRes = await request('/vouchers', 'POST', salesVPayload, { Cookie: cookieHeader });
    assert('Create Sales Voucher returns 201', svRes.status === 201, svRes);
    assert('Sales Voucher number matches SAL-1', svRes.body && svRes.body.voucher_number === 'SAL-1', svRes.body);
    if (svRes.body && svRes.body.voucher) salesVoucherId = svRes.body.voucher.id;

    // 6. Verify Ledger postings
    console.log('\nStep 6: Verifying double-entry ledger postings...');
    const svDetail = await request(`/vouchers/${salesVoucherId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Load details returns 200', svDetail.status === 200, svDetail);
    if (svDetail.body && svDetail.body.voucher) {
      const v = svDetail.body.voucher;
      const customerPosting = v.entries.find(e => e.ledger_id === customerLedgerId);
      assert('Customer ledger is debited by $3068', customerPosting && parseFloat(customerPosting.debit_amount) === 3068.00, customerPosting);

      const salesPosting = v.entries.find(e => e.ledger_id === salesLedgerId);
      assert('Sales income is credited by $2600', salesPosting && parseFloat(salesPosting.credit_amount) === 2600.00, salesPosting);
    }

    // 7. Verify stock levels reduced
    console.log('\nStep 7: Verifying stock reduction...');
    const stockRes2 = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (stockRes2.body && stockRes2.body.items) {
      const laptop = stockRes2.body.items.find(i => i.id === laptopItemId);
      assert('Laptop stock reduced to 6 (10 - 4)', laptop && parseFloat(laptop.quantity) === 6, laptop);
    }

    // 8. Test negative stock constraint
    console.log('\nStep 8: Asserting negative stock validation block...');
    const overSalesPayload = {
      company_id: companyId,
      voucher_type: 'sales',
      voucher_date: '2026-06-28',
      party_ledger_id: customerLedgerId,
      sales_ledger_id: salesLedgerId,
      items: [{ stock_item_id: laptopItemId, quantity: 15, rate: 650.00 }] // requesting 15 when only 6 left!
    };
    const overRes = await request('/vouchers', 'POST', overSalesPayload, { Cookie: cookieHeader });
    assert('Over-selling gets blocked with 400', overRes.status === 400, overRes);
    assert('Correct error message returned', overRes.body && overRes.body.message.includes('stock not available'), overRes.body);

    // 9. Void Sales and check Stock restoration
    console.log('\nStep 9: Voiding Sales Voucher & checking stock restoration...');
    const deleteRes = await request(`/vouchers/${salesVoucherId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete Sales Voucher returns 200', deleteRes.status === 200, deleteRes);

    const stockRes3 = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (stockRes3.body && stockRes3.body.items) {
      const laptop = stockRes3.body.items.find(i => i.id === laptopItemId);
      assert('Stock successfully restored back to 10', laptop && parseFloat(laptop.quantity) === 10, laptop);
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL SALES VOUCHER TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
