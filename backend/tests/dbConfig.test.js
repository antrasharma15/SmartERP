/**
 * Checks how config/db.js turns DATABASE_URL into pg pool options.
 * Run: node tests/dbConfig.test.js
 *
 * The three shapes below are the three places this app actually runs:
 * a laptop, a Cloud Run + Cloud SQL socket, and a plain remote TCP host.
 */
const assert = require('assert');
const path = require('path');

const DB_PATH = require.resolve('../config/db');

function optionsFor(url) {
  delete require.cache[DB_PATH];
  process.env.DATABASE_URL = url;
  return require(DB_PATH).options;
}

// 1. Cloud Run -> Cloud SQL over a unix socket. No port to parse, and SSL must
//    stay off: the socket is already encrypted and pg fails if we negotiate.
{
  const o = optionsFor(
    'postgresql://appuser:p@ss@/smarterp?host=/cloudsql/my-proj:asia-south1:smarterp-db'
  );
  assert.strictEqual(o.ssl, false, 'cloud sql socket must not use ssl');
  // pg parses a connectionString lazily at connect time, so assert we handed
  // the URL through intact rather than shredding it with the host:port regex.
  assert.ok(
    String(o.connectionString).includes('/cloudsql/'),
    `socket URL must pass through untouched, got ${o.connectionString}`
  );
  assert.strictEqual(o.host, undefined, 'must not set an explicit host');
}

// 2. Localhost dev. SSL off, credentials parsed out of the URL.
{
  const o = optionsFor('postgresql://postgres:secret@localhost:5432/smarterp');
  assert.strictEqual(o.ssl, false, 'localhost must not use ssl');
  assert.strictEqual(o.host, 'localhost');
  assert.strictEqual(o.port, 5432);
  assert.strictEqual(o.user, 'postgres');
  assert.strictEqual(o.database, 'smarterp');
}

// 3. Remote TCP host. SSL on. The hand-rolled regex exists because a password
//    containing '?' or '$' breaks node:url, so make sure that still holds.
{
  const o = optionsFor('postgresql://admin:pa$$w?rd@10.20.30.40:5432/smarterp');
  assert.ok(o.ssl, 'remote host must use ssl');
  assert.strictEqual(o.host, '10.20.30.40');
  assert.strictEqual(o.password, 'pa$$w?rd', 'password with ? and $ must survive');
  assert.strictEqual(o.database, 'smarterp');
}

// 4. Docker container network host with DB_SSL=false.
{
  process.env.DB_SSL = 'false';
  const o = optionsFor('postgresql://postgres:postgres@db:5432/smarterp');
  assert.strictEqual(o.ssl, false, 'docker container host with DB_SSL=false must not use ssl');
  assert.strictEqual(o.host, 'db');
  assert.strictEqual(o.port, 5432);
  assert.strictEqual(o.user, 'postgres');
  assert.strictEqual(o.database, 'smarterp');
  delete process.env.DB_SSL;
}

console.log('db config: 4/4 passed');
