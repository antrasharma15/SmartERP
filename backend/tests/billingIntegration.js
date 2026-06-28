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
  const testEmail = `billinguser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Billing Test User`;
  let cookieHeader = '';
  let companyId = '';

  // Master records IDs
  let supplierLedgerId = '';
  let customerId = '';
  let customerLedgerId = '';
  let purchaseLedgerId = '';
  let salesLedgerId = '';
  let cgstLedgerId = '';
  let sgstLedgerId = '';
  let keyboardItemId = '';
  let invoiceId = '';

  console.log(`========================================`);
  console.log(`Running Billing Invoicing API Integration Tests`);
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
      name: `Billing Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Company created successfully', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 2. Setup Ledgers
    console.log('\nStep 2: Creating ledger accounts...');
    // Create Supplier Ledger
    const supplierRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Global Keyboards Inc',
      ledger_type: 'supplier',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    if (supplierRes.body && supplierRes.body.ledger) supplierLedgerId = supplierRes.body.ledger.id;

    // Create Purchase Ledger
    const purchaseRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Purchase Account',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (purchaseRes.body && purchaseRes.body.ledger) purchaseLedgerId = purchaseRes.body.ledger.id;

    // Create Sales Ledger (Income type)
    const salesRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Sales Revenue Account',
      ledger_type: 'income',
      opening_balance: 0,
      opening_balance_type: 'cr'
    }, { Cookie: cookieHeader });
    assert('Sales Ledger created', salesRes.status === 201, salesRes);
    if (salesRes.body && salesRes.body.ledger) salesLedgerId = salesRes.body.ledger.id;

    // Create CGST / SGST Ledgers
    const cgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Output CGST',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (cgstRes.body && cgstRes.body.ledger) cgstLedgerId = cgstRes.body.ledger.id;

    const sgstRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Output SGST',
      ledger_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    if (sgstRes.body && sgstRes.body.ledger) sgstLedgerId = sgstRes.body.ledger.id;

    // 3. Create Customer
    console.log('\nStep 3: Creating customer (Zenith Distributors)...');
    const custRes = await request('/customers', 'POST', {
      company_id: companyId,
      name: 'Zenith Distributors',
      mobile: '9876543210',
      email: 'zenith@example.com',
      gst_number: '27ABCDE1234F1Z1',
      address: 'Mumbai'
    }, { Cookie: cookieHeader });
    assert('Customer created returns 201', custRes.status === 201, custRes);
    if (custRes.body && custRes.body.customer) {
      customerId = custRes.body.customer.id;
      customerLedgerId = custRes.body.customer.ledger_id;
      assert('Auto-ledger created for customer', customerLedgerId !== null && customerLedgerId !== undefined, custRes.body.customer);
    }

    // 4. Create Stock Item
    console.log('\nStep 4: Creating stock item...');
    const itemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Keychron K2 Mechanical Keyboard',
      sku: 'KEYCHRON-K2',
      purchase_price: 70.00,
      selling_price: 90.00,
      gst_percentage: 18.00,
      quantity: 0
    }, { Cookie: cookieHeader });
    if (itemRes.body && itemRes.body.item) keyboardItemId = itemRes.body.item.id;

    // 5. Purchase Vouchers to stock up (10 Keyboards)
    console.log('\nStep 5: Seeding stock with Purchase Voucher...');
    const purchaseVPayload = {
      company_id: companyId,
      voucher_type: 'purchase',
      voucher_date: '2026-06-28',
      reference: 'KEY-0012',
      narration: 'Stock seed',
      party_ledger_id: supplierLedgerId,
      purchase_ledger_id: purchaseLedgerId,
      items: [{ stock_item_id: keyboardItemId, quantity: 10, rate: 70.00 }]
    };
    const pvRes = await request('/vouchers', 'POST', purchaseVPayload, { Cookie: cookieHeader });
    assert('Stock seeded successfully', pvRes.status === 201, pvRes);

    // 6. Create Billing Invoice
    console.log('\nStep 6: Creating Tax Invoice (Selling 4 keyboards)...');
    const invoicePayload = {
      company_id: companyId,
      customer_id: customerId,
      invoice_type: 'gst',
      invoice_date: '2026-06-28',
      items: [
        {
          stock_item_id: keyboardItemId,
          description: 'Selling Keychron Keyboard',
          quantity: 4,
          rate: 90.00,
          gst_percentage: 18.00
        }
      ]
    };
    const invRes = await request('/invoices', 'POST', invoicePayload, { Cookie: cookieHeader });
    assert('Create invoice returns 201', invRes.status === 201, invRes);
    assert('Invoice number generated sequentially', invRes.body && invRes.body.invoice_number === 'INV-26-0001', invRes.body);
    if (invRes.body && invRes.body.invoice) invoiceId = invRes.body.invoice.id;

    // 7. Verify general ledger entries from linked voucher
    console.log('\nStep 7: Verifying double-entry ledger postings...');
    const invDetail = await request(`/invoices/${invoiceId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Fetch invoice detail returns 200', invDetail.status === 200, invDetail);
    if (invDetail.body && invDetail.body.invoice) {
      const inv = invDetail.body.invoice;
      assert('Invoice is linked to a sales voucher', inv.voucher_id !== null, inv);
      assert('Calculated subtotal matches $360', parseFloat(inv.subtotal) === 360.00, inv);
      assert('Calculated tax matches $64.80', parseFloat(inv.tax_amount) === 64.80, inv);
      assert('Calculated total matches $424.80', parseFloat(inv.total_amount) === 424.80, inv);

      // Verify double entries
      assert('Entries array returned', inv.entries && inv.entries.length > 0, inv.entries);
      const customerPosting = inv.entries.find(e => e.ledger_id === customerLedgerId);
      assert('Customer debited by $424.80', customerPosting && parseFloat(customerPosting.debit_amount) === 424.80, customerPosting);

      const salesPosting = inv.entries.find(e => e.ledger_id === salesLedgerId);
      assert('Sales income credited by $360.00', salesPosting && parseFloat(salesPosting.credit_amount) === 360.00, salesPosting);
    }

    // 8. Verify stock deduction
    console.log('\nStep 8: Verifying stock reduction...');
    const stockRes = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (stockRes.body && stockRes.body.items) {
      const item = stockRes.body.items.find(i => i.id === keyboardItemId);
      assert('Stock quantity reduced to 6 (10 - 4)', item && parseFloat(item.quantity) === 6, item);
    }

    // 9. Negative stock check
    console.log('\nStep 9: Asserting negative stock block on invoicing...');
    const overInvoicePayload = {
      company_id: companyId,
      customer_id: customerId,
      invoice_type: 'gst',
      invoice_date: '2026-06-28',
      items: [{ stock_item_id: keyboardItemId, quantity: 15, rate: 90.00 }]
    };
    const overRes = await request('/invoices', 'POST', overInvoicePayload, { Cookie: cookieHeader });
    assert('Over-selling invoice gets blocked with 400', overRes.status === 400, overRes);
    assert('Correct error message', overRes.body && overRes.body.message.includes('stock not available'), overRes.body);

    // 10. Delete invoice & check rollback
    console.log('\nStep 10: Voiding invoice and checking stock restoration...');
    const delRes = await request(`/invoices/${invoiceId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete invoice returns 200', delRes.status === 200, delRes);

    const rollbackRes = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    if (rollbackRes.body && rollbackRes.body.items) {
      const item = rollbackRes.body.items.find(i => i.id === keyboardItemId);
      assert('Stock quantity successfully rolled back to 10', item && parseFloat(item.quantity) === 10, item);
    }

    const checkDeletedRes = await request(`/invoices/${invoiceId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Fetch deleted invoice returns 404', checkDeletedRes.status === 404, checkDeletedRes);

  } catch (err) {
    console.error('Test run failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL BILLING SYSTEM TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
