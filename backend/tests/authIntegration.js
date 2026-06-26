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
  const testEmail = `testuser_${suffix}@example.com`;
  const testPassword = `Password123!`;
  const testName = `Test User`;

  console.log(`========================================`);
  console.log(`Running Auth Integration Tests on ${BASE_URL}`);
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
    // 1. Register valid user
    console.log('Case 1: Register valid user...');
    const regRes = await request('/auth/register', 'POST', {
      name: testName,
      email: testEmail,
      password: testPassword
    });
    assert('Register valid user returns 201', regRes.status === 201, regRes);

    // 2. Register duplicate email
    console.log('\nCase 2: Register duplicate email...');
    const dupRes = await request('/auth/register', 'POST', {
      name: testName,
      email: testEmail,
      password: testPassword
    });
    assert('Register duplicate email returns 400', dupRes.status === 400, dupRes);

    // 3. Register invalid email
    console.log('\nCase 3: Register invalid email...');
    const invEmailRes = await request('/auth/register', 'POST', {
      name: testName,
      email: 'invalid-email',
      password: testPassword
    });
    assert('Register invalid email returns 400', invEmailRes.status === 400, invEmailRes);

    // 4. Register weak password
    console.log('\nCase 4: Register weak password...');
    const weakPwdRes = await request('/auth/register', 'POST', {
      name: testName,
      email: `weak_${suffix}@example.com`,
      password: 'short'
    });
    assert('Register weak password returns 400', weakPwdRes.status === 400, weakPwdRes);

    // 5. Register empty name
    console.log('\nCase 5: Register empty name...');
    const empNameRes = await request('/auth/register', 'POST', {
      name: '   ',
      email: `emptyname_${suffix}@example.com`,
      password: testPassword
    });
    assert('Register empty name returns 400', empNameRes.status === 400, empNameRes);

    // 6. Login unregistered user
    console.log('\nCase 6: Login unregistered user...');
    const unregLoginRes = await request('/auth/login', 'POST', {
      email: `unregistered_${suffix}@example.com`,
      password: testPassword
    });
    assert('Login unregistered user returns 401 (Not 429)', unregLoginRes.status === 401, unregLoginRes);

    // 7. Login incorrect password
    console.log('\nCase 7: Login incorrect password...');
    const incPwdLoginRes = await request('/auth/login', 'POST', {
      email: testEmail,
      password: 'wrong_password'
    });
    assert('Login incorrect password returns 401 (Not 429)', incPwdLoginRes.status === 401, incPwdLoginRes);

    // 8. Login correct credentials
    console.log('\nCase 8: Login correct credentials...');
    const correctLoginRes = await request('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword
    });
    assert('Login correct credentials returns 200 (Not 429)', correctLoginRes.status === 200, correctLoginRes);
    assert('Cookie is set on login', !!(correctLoginRes.headers['set-cookie']), correctLoginRes.headers);

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTests();
