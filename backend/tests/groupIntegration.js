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
  const testEmail = `groupuser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Group Test User`;
  let cookieHeader = '';
  let companyId = '';
  let primaryAssetGroupId = '';
  
  // Custom groups IDs
  let fixedAssetsId = '';
  let subAId = '';
  let subBId = '';

  console.log(`========================================`);
  console.log(`Running Group API Integration Tests on ${BASE_URL}`);
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
      cookieHeader = setCookie[0].split(';')[0];
    }

    // 3. Create a Company (seeds default Groups: Assets, Liabilities, Income, Expenses)
    console.log('\nStep 3: Creating a company (seeds groups)...');
    const compRes = await request('/companies', 'POST', {
      name: `Group Test Company ${suffix}`,
      address: '456 Group Rd',
      gst_number: '22AAAAA2222A2Z2',
      state: 'New York',
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieHeader });
    assert('Create company returns 201', compRes.status === 201, compRes);
    if (compRes.body && compRes.body.company) {
      companyId = compRes.body.company.id;
    }

    // 4. Retrieve seeded groups
    console.log('\nStep 4: Fetching seeded groups...');
    const groupsRes = await request(`/groups?company_id=${companyId}`, 'GET', null, { Cookie: cookieHeader });
    assert('Get groups list returns 200', groupsRes.status === 200, groupsRes);
    assert('Contains 4 seeded groups', groupsRes.body && groupsRes.body.groups && groupsRes.body.groups.length === 4, groupsRes.body);
    
    if (groupsRes.body && groupsRes.body.groups) {
      const assetGroup = groupsRes.body.groups.find(g => g.name.toLowerCase() === 'assets');
      if (assetGroup) primaryAssetGroupId = assetGroup.id;
    }

    // 5. Create a Group "Fixed Assets" under parent group "Assets"
    console.log('\nStep 5: Creating custom group "Fixed Assets" under "Assets"...');
    const groupRes = await request('/groups', 'POST', {
      company_id: companyId,
      name: 'Fixed Assets',
      type: 'asset',
      parent_id: primaryAssetGroupId
    }, { Cookie: cookieHeader });
    assert('Create group returns 201', groupRes.status === 201, groupRes);
    if (groupRes.body && groupRes.body.group) {
      fixedAssetsId = groupRes.body.group.id;
      assert('Parent group ID matches', groupRes.body.group.parent_id === primaryAssetGroupId, groupRes.body.group);
    }

    // 6. Attempt duplicate name group creation
    console.log('\nStep 6: Creating duplicate name group...');
    const dupRes = await request('/groups', 'POST', {
      company_id: companyId,
      name: 'Fixed Assets', // Duplicate
      type: 'asset',
      parent_id: primaryAssetGroupId
    }, { Cookie: cookieHeader });
    assert('Duplicate group creation returns 400', dupRes.status === 400, dupRes);

    // 7. Update group details (Alter)
    console.log('\nStep 7: Altering group name...');
    const updateRes = await request(`/groups/${fixedAssetsId}`, 'PUT', {
      name: 'Tangible Fixed Assets',
      type: 'asset',
      parent_id: primaryAssetGroupId
    }, { Cookie: cookieHeader });
    assert('Update returns 200', updateRes.status === 200, updateRes);
    assert('Name updated successfully', updateRes.body && updateRes.body.group && updateRes.body.group.name === 'Tangible Fixed Assets', updateRes.body);

    // 8. Create Sub Group A and Sub Group B for cycle check validation
    console.log('\nStep 8a: Creating "Sub Group A" under "Tangible Fixed Assets"...');
    const subARes = await request('/groups', 'POST', {
      company_id: companyId,
      name: 'Sub Group A',
      type: 'asset',
      parent_id: fixedAssetsId
    }, { Cookie: cookieHeader });
    assert('Sub Group A returns 201', subARes.status === 201, subARes);
    if (subARes.body && subARes.body.group) subAId = subARes.body.group.id;

    console.log('Step 8b: Creating "Sub Group B" under "Sub Group A"...');
    const subBRes = await request('/groups', 'POST', {
      company_id: companyId,
      name: 'Sub Group B',
      type: 'asset',
      parent_id: subAId
    }, { Cookie: cookieHeader });
    assert('Sub Group B returns 201', subBRes.status === 201, subBRes);
    if (subBRes.body && subBRes.body.group) subBId = subBRes.body.group.id;

    // 9. Circular reference check (Make Tangible Fixed Assets parent to Sub Group B)
    console.log('\nStep 9: Testing cycle check (update Tangible Fixed Assets parent to Sub Group B)...');
    const cycleRes = await request(`/groups/${fixedAssetsId}`, 'PUT', {
      name: 'Tangible Fixed Assets',
      type: 'asset',
      parent_id: subBId // Try setting parent to descendant
    }, { Cookie: cookieHeader });
    assert('Circular parenting check returns 400', cycleRes.status === 400, cycleRes);
    assert('Cycle check returns descriptive message', cycleRes.body && cycleRes.body.message.includes('Circular reference'), cycleRes.body);

    // 10. Attempt to delete group with active child subgroups
    console.log('\nStep 10: Deleting parent group that contains subgroups...');
    const delParentRes = await request(`/groups/${fixedAssetsId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Deleting populated group returns 400', delParentRes.status === 400, delParentRes);
    assert('Descriptive message about subgroups returned', delParentRes.body && delParentRes.body.message.includes('contains sub-groups'), delParentRes.body);

    // 11. Attempt to delete group that contains active ledgers
    console.log('\nStep 11a: Creating a ledger under "Sub Group B"...');
    const ledRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      group_id: subBId,
      name: 'Test Machinery Ledger',
      ledger_type: 'Bank',
      opening_balance: 5000,
      opening_balance_type: 'dr'
    }, { Cookie: cookieHeader });
    assert('Ledger created successfully under Sub Group B', ledRes.status === 201, ledRes);

    console.log('Step 11b: Deleting "Sub Group B" which contains the ledger...');
    const delLedGroupRes = await request(`/groups/${subBId}`, 'DELETE', null, { Cookie: cookieHeader });
    assert('Deleting group containing ledger returns 400', delLedGroupRes.status === 400, delLedGroupRes);
    assert('Descriptive message about active ledgers returned', delLedGroupRes.body && delLedGroupRes.body.message.includes('active ledger accounts'), delLedGroupRes.body);

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL GROUP TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
