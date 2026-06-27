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
  const testEmail = `ledgeruser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Ledger Test User`;
  let cookieHeader = '';
  let companyId = '';
  let defaultGroupId = '';
  let ledgerId = '';

  console.log(`========================================`);
  console.log(`Running Ledger API Integration Tests on ${BASE_URL}`);
  console.log(`========================================\n`);

  let failures = 0;

  // Helper to assert conditions
  const assert = (name, condition, details) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} - Expected condition met. Details:`, details);
      failures++;
    }
  };

  try {
    // 1. Register user
    console.log('Step 1: Registering test user...');
    const regRes = await request('/auth/register', 'POST', {
      name: testName,
      email: testEmail,
      password: testPassword
    });
    assert('Register returns 201', regRes.status === 201, regRes);

    // 2. Login user to get cookie
    console.log('\nStep 2: Logging in test user...');
    const loginRes = await request('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword
    });
    assert('Login returns 200', loginRes.status === 200, loginRes);
    
    const setCookie = loginRes.headers['set-cookie'];
    assert('Cookie header received', !!setCookie, loginRes.headers);
    if (setCookie) {
      cookieHeader = setCookie[0].split(';')[0]; // Extract token cookie
    }

    // 3. Create a Company (Ledgers require a company)
    console.log('\nStep 3: Creating a company...');
    const compRes = await request('/companies', 'POST', {
      name: `Ledger Test Company ${suffix}`,
      address: '123 Test St',
      gst_number: '22AAAAA1111A1Z1',
      state: 'California',
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Create company returns 21', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 4. Retrieve default groups seeded for company
    console.log('\nStep 4: Retrieving seeded groups...');
    const groupsRes = await request(`/ledgers/groups?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Get groups returns 200', groupsRes.status === 200, groupsRes);
    assert('Seeded groups count > 0', groupsRes.body && groupsRes.body.groups && groupsRes.body.groups.length > 0, groupsRes.body);
    if (groupsRes.body && groupsRes.body.groups && groupsRes.body.groups.length > 0) {
      defaultGroupId = groupsRes.body.groups[0].id; // Assign first group (e.g. Assets)
      console.log(`[Test Info] Seeded groups list:`, groupsRes.body.groups.map(g => `${g.name} (${g.type})`));
    }

    // 5. Create a Ledger
    console.log('\nStep 5: Creating a ledger...');
    const ledgerRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      group_id: defaultGroupId,
      name: 'Office Expenses',
      ledger_type: 'Expense',
      opening_balance: 150.50,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Create ledger returns 201', ledgerRes.status === 201, ledgerRes);
    if (ledgerRes.body && ledgerRes.body.ledger) {
      ledgerId = ledgerRes.body.ledger.id;
      assert('Ledger name matches input', ledgerRes.body.ledger.name === 'Office Expenses', ledgerRes.body.ledger);
    }

    // 6. Attempt duplicate name ledger creation
    console.log('\nStep 6: Creating duplicate name ledger...');
    const dupRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      group_id: defaultGroupId,
      name: 'Office Expenses', // Same name
      ledger_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Duplicate ledger returns 400', dupRes.status === 400, dupRes);

    // 7. Get all ledgers for the company
    console.log('\nStep 7: Listing all ledgers...');
    const listRes = await request(`/ledgers?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('List ledgers returns 200', listRes.status === 200, listRes);
    assert('Ledger list contains new ledger', listRes.body && listRes.body.ledgers && listRes.body.ledgers.some(l => l.id === ledgerId), listRes.body);

    // 8. Update ledger details
    console.log('\nStep 8: Updating ledger details (Alter)...');
    const updateRes = await request(`/ledgers/${ledgerId}`, 'PUT', {
      name: 'Office Equipment Expenses',
      group_id: defaultGroupId,
      ledger_type: 'Expense',
      opening_balance: 320.00,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Update ledger returns 200', updateRes.status === 200, updateRes);
    assert('Ledger name updated', updateRes.body && updateRes.body.ledger && updateRes.body.ledger.name === 'Office Equipment Expenses', updateRes.body);

    // 9. Delete the ledger
    console.log('\nStep 9: Deleting the ledger...');
    const delRes = await request(`/ledgers/${ledgerId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete ledger returns 200', delRes.status === 200, delRes);

    // 10. Verify ledger no longer exists
    console.log('\nStep 10: Verifying ledger is deleted...');
    const verifyRes = await request(`/ledgers/${ledgerId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Get deleted ledger returns 404', verifyRes.status === 404, verifyRes);

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL LEDGER TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
