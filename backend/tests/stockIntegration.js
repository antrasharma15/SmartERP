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
  const testEmail = `stockuser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Stock Test User`;
  let cookieHeader = '';
  let companyId = '';

  // Resource IDs
  let pcsUnitId = '';
  let hardwareGroupId = '';
  let laptopsGroupId = '';
  let macbookItemId = '';

  console.log(`========================================`);
  console.log(`Running Stock & Inventory API Integration Tests`);
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
    // 1. Auth setup
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
      name: `Stock Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Company created successfully', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // ==========================================
    // 2. UNITS OF MEASURE TESTS
    // ==========================================
    console.log('\n--- Testing Units of Measure CRUD ---');
    const createUnitRes = await request('/units', 'POST', {
      company_id: companyId,
      symbol: 'PCS',
      name: 'Pieces'
    }, { Cookie: cookieHeader });
    assert('Create unit returns 201', createUnitRes.status === 201, createUnitRes);
    if (createUnitRes.body && createUnitRes.body.unit) {
      pcsUnitId = createUnitRes.body.unit.id;
    }

    const dupUnitRes = await request('/units', 'POST', {
      company_id: companyId,
      symbol: 'PCS', // duplicate symbol
      name: 'Other Pieces'
    }, { Cookie: cookieHeader });
    assert('Duplicate unit symbol returns 400', dupUnitRes.status === 400, dupUnitRes);

    const getUnitsRes = await request(`/units?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('List units returns 200', getUnitsRes.status === 200, getUnitsRes);
    assert('List contains PCS unit', getUnitsRes.body && getUnitsRes.body.units && getUnitsRes.body.units.some(u => u.symbol === 'PCS'), getUnitsRes.body);

    const updateUnitRes = await request(`/units/${pcsUnitId}`, 'PUT', {
      symbol: 'PCS',
      name: 'Standard Pieces'
    }, { Cookie: cookieHeader });
    assert('Update unit returns 200', updateUnitRes.status === 200, updateUnitRes);
    assert('Unit name updated successfully', updateUnitRes.body && updateUnitRes.body.unit && updateUnitRes.body.unit.name === 'Standard Pieces', updateUnitRes.body);

    // ==========================================
    // 3. STOCK GROUPS TESTS
    // ==========================================
    console.log('\n--- Testing Stock Groups CRUD & Cycles ---');
    const createGroupRes = await request('/stock-groups', 'POST', {
      company_id: companyId,
      name: 'Hardware'
    }, { Cookie: cookieHeader });
    assert('Create primary stock group returns 201', createGroupRes.status === 201, createGroupRes);
    if (createGroupRes.body && createGroupRes.body.group) {
      hardwareGroupId = createGroupRes.body.group.id;
    }

    const createSubGroupRes = await request('/stock-groups', 'POST', {
      company_id: companyId,
      name: 'Laptops',
      parent_id: hardwareGroupId
    }, { Cookie: cookieHeader });
    assert('Create child stock group returns 201', createSubGroupRes.status === 201, createSubGroupRes);
    if (createSubGroupRes.body && createSubGroupRes.body.group) {
      laptopsGroupId = createSubGroupRes.body.group.id;
    }

    // Circular dependency check
    const cycleRes = await request(`/stock-groups/${hardwareGroupId}`, 'PUT', {
      name: 'Hardware',
      parent_id: laptopsGroupId // Try to make parent a descendant
    }, { Cookie: cookieHeader });
    assert('Circular parenting returns 400', cycleRes.status === 400, cycleRes);
    assert('Circular parenting error has descriptive message', cycleRes.body && cycleRes.body.message.includes('Circular reference'), cycleRes.body);

    // ==========================================
    // 4. STOCK ITEMS TESTS
    // ==========================================
    console.log('\n--- Testing Stock Items CRUD ---');
    const createItemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Macbook Pro 16',
      sku: 'MAC-16-M3',
      stock_group_id: laptopsGroupId,
      unit_id: pcsUnitId,
      purchase_price: 1999,
      selling_price: 2499,
      gst_percentage: 18,
      quantity: 10,
      reorder_level: 2
    }, { Cookie: cookieHeader });
    assert('Create stock item returns 201', createItemRes.status === 201, createItemRes);
    if (createItemRes.body && createItemRes.body.item) {
      macbookItemId = createItemRes.body.item.id;
    }

    const dupItemRes = await request('/stock-items', 'POST', {
      company_id: companyId,
      name: 'Macbook Pro 16', // duplicate name
      sku: 'MAC-NEW',
      stock_group_id: laptopsGroupId,
      unit_id: pcsUnitId
    }, { Cookie: cookieHeader });
    assert('Duplicate stock item name returns 400', dupItemRes.status === 400, dupItemRes);

    const getItemsRes = await request(`/stock-items?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('List stock items returns 200', getItemsRes.status === 200, getItemsRes);
    assert('Item has loaded group and unit labels', getItemsRes.body && getItemsRes.body.items && getItemsRes.body.items[0].group_name === 'Laptops' && getItemsRes.body.items[0].unit_symbol === 'PCS', getItemsRes.body);

    // ==========================================
    // 5. DELETION REF CONSTRAINTS TESTS
    // ==========================================
    console.log('\n--- Testing Deletion Constraints ---');
    // Try to delete unit in use
    const delUnitFailRes = await request(`/units/${pcsUnitId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Deleting unit in-use returns 400', delUnitFailRes.status === 400, delUnitFailRes);

    // Try to delete group in use
    const delGroupFailRes = await request(`/stock-groups/${laptopsGroupId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Deleting stock group in-use returns 400', delGroupFailRes.status === 400, delGroupFailRes);

    // Successful cleanup
    console.log('\n--- Cleaning up assets ---');
    const delItemRes = await request(`/stock-items/${macbookItemId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete stock item returns 200', delItemRes.status === 200, delItemRes);

    const delSubGroupRes = await request(`/stock-groups/${laptopsGroupId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete child stock group returns 200', delSubGroupRes.status === 200, delSubGroupRes);

    const delParentGroupRes = await request(`/stock-groups/${hardwareGroupId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete parent stock group returns 200', delParentGroupRes.status === 200, delParentGroupRes);

    const delUnitSuccessRes = await request(`/units/${pcsUnitId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Delete unit returns 200', delUnitSuccessRes.status === 200, delUnitSuccessRes);

  } catch (err) {
    console.error('Test execution failed with exception:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL INVENTORY & STOCK TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
