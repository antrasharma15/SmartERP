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
  
  // User A (Owner)
  const emailA = `owner_${suffix}@example.com`;
  const passwordA = `Password123!`;
  const nameA = `Owner User`;
  let cookieA = '';
  let userIdA = '';
  
  // User B (Operator)
  const emailB = `operator_${suffix}@example.com`;
  const passwordB = `Password123!`;
  const nameB = `Operator User`;
  let cookieB = '';
  let userIdB = '';

  let companyId = '';
  let failures = 0;

  const assert = (name, condition, details) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} - Details:`, details);
      failures++;
    }
  };

  console.log(`========================================`);
  console.log(`Running Settings & Concurrency Lock Integration Tests`);
  console.log(`========================================\n`);

  try {
    // 1. Register & Login User A
    const regResA = await request('/auth/register', 'POST', { name: nameA, email: emailA, password: passwordA });
    assert('Register Owner returns 201', regResA.status === 201, regResA);

    const loginResA = await request('/auth/login', 'POST', { email: emailA, password: passwordA });
    assert('Login Owner returns 200', loginResA.status === 200, loginResA);
    if (loginResA.headers['set-cookie']) {
      cookieA = loginResA.headers['set-cookie'][0].split(';')[0];
    }
    userIdA = loginResA.body.user.id;

    // 2. Register & Login User B
    const regResB = await request('/auth/register', 'POST', { name: nameB, email: emailB, password: passwordB });
    assert('Register Operator returns 201', regResB.status === 201, regResB);

    const loginResB = await request('/auth/login', 'POST', { email: emailB, password: passwordB });
    assert('Login Operator returns 200', loginResB.status === 200, loginResB);
    if (loginResB.headers['set-cookie']) {
      cookieB = loginResB.headers['set-cookie'][0].split(';')[0];
    }
    userIdB = loginResB.body.user.id;

    // 3. User A creates Company
    const compRes = await request('/companies', 'POST', {
      name: `Lock Test Company ${suffix}`,
      financial_year_start: '2026-04-01',
      financial_year_end: '2027-03-31'
    }, { Cookie: cookieA });
    assert('Company created successfully', compRes.status === 201, compRes);
    companyId = compRes.body.company.id;

    // 4. Check initial lock status (should be unlocked)
    const lockInit = await request(`/settings/lock-status?company_id=${companyId}`, 'GET', null, { Cookie: cookieA });
    assert('Initial system lock state is free', lockInit.status === 200 && lockInit.body.locked === false, lockInit);

    // 5. User A updates company profile details
    const profileRes = await request('/settings/company', 'PUT', {
      company_id: companyId,
      name: `Lock Test Company ${suffix} Updated`,
      address: '123 Lock St',
      currency: '€'
    }, { Cookie: cookieA, 'x-company-id': companyId });
    assert('Update company settings returns 200', profileRes.status === 200, profileRes);

    // 6. Fetch lock status (should be locked by User A now due to the PUT operation!)
    const lockAfterWrite = await request(`/settings/lock-status?company_id=${companyId}`, 'GET', null, { Cookie: cookieA });
    assert('System lock claimed by Owner after write', lockAfterWrite.status === 200 && lockAfterWrite.body.locked === true && lockAfterWrite.body.user_id === userIdA, lockAfterWrite);

    // 7. Invite User B to the company
    const inviteRes = await request('/settings/users/invite', 'POST', {
      company_id: companyId,
      email: emailB,
      role: 'accountant'
    }, { Cookie: cookieA, 'x-company-id': companyId });
    assert('Invite Operator user returns 201', inviteRes.status === 201, inviteRes);

    // 8. User B (with access to company) tries to write (create a ledger)
    // This should be BLOCKED because User A holds the active lock!
    const blockRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Operator Ledger',
      ledger_type: 'bank'
    }, { Cookie: cookieB, 'x-company-id': companyId });
    assert('Mutating request from another user is blocked (423 Locked)', blockRes.status === 423, blockRes);

    // 9. User A force releases the lock
    const releaseRes = await request('/settings/lock/release', 'POST', {
      company_id: companyId
    }, { Cookie: cookieA });
    assert('Owner force releases system lock', releaseRes.status === 200, releaseRes);

    const lockAfterRelease = await request(`/settings/lock-status?company_id=${companyId}`, 'GET', null, { Cookie: cookieA });
    assert('System lock is free again', lockAfterRelease.body.locked === false, lockAfterRelease);

    // 10. User B attempts to write again (should now succeed and claim lock!)
    const writeSuccessRes = await request('/ledgers', 'POST', {
      company_id: companyId,
      name: 'Operator Ledger Success',
      ledger_type: 'bank'
    }, { Cookie: cookieB, 'x-company-id': companyId });
    assert('Operator writes successfully after lock release (201)', writeSuccessRes.status === 201, writeSuccessRes);

    // 11. Fetch lock status (should be locked by User B now)
    const lockAfterBWrite = await request(`/settings/lock-status?company_id=${companyId}`, 'GET', null, { Cookie: cookieB });
    assert('System lock claimed by Operator', lockAfterBWrite.body.locked === true && lockAfterBWrite.body.user_id === userIdB, lockAfterBWrite);

    // 12. Owner (User A) force releases User B's lock
    const releaseBRes = await request('/settings/lock/release', 'POST', {
      company_id: companyId
    }, { Cookie: cookieA });
    assert('Owner overrides and force releases Operator lock', releaseBRes.status === 200, releaseBRes);

    // 13. Test other configuration updates: Save invoice format settings
    const invRes = await request('/settings/invoice', 'PUT', {
      company_id: companyId,
      auto_numbering_prefix: 'TEST-',
      auto_numbering_start: 100,
      template_preset: 'modern',
      default_payment_terms: 'net_15'
    }, { Cookie: cookieA, 'x-company-id': companyId });
    assert('Update invoice numbering configurations returns 200', invRes.status === 200, invRes);

    // 14. Add tax rate
    const taxRes = await request('/settings/taxes', 'POST', {
      company_id: companyId,
      name: 'VAT 10%',
      percentage: 10,
      is_default: true
    }, { Cookie: cookieA, 'x-company-id': companyId });
    assert('Add tax rate returns 201', taxRes.status === 201, taxRes);

    // 15. Fetch Audit Logs
    const auditRes = await request(`/settings/audit-logs?company_id=${companyId}`, 'GET', null, { Cookie: cookieA });
    assert('Fetch audit logs returns 200', auditRes.status === 200, auditRes);
    assert('Audit logs recorded events correctly', auditRes.body.logs.length > 0, auditRes.body.logs);

    console.log(`\n========================================`);
    if (failures === 0) {
      console.log(`ALL SETTINGS AND LOCK INTEGRATION TESTS PASSED SUCCESSFULLY!`);
    } else {
      console.error(`SETTINGS INTEGRATION TESTS COMPLETED WITH ${failures} FAILURE(S).`);
    }
    console.log(`========================================`);

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  }
}

runTests();
