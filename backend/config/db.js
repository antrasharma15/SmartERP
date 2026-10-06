const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {};

const dbUrl = process.env.DATABASE_URL;

// Cloud SQL over the Cloud Run unix socket:
//   postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
// It has no port, so the host:port regex below cannot parse it, and the socket
// is already encrypted so negotiating SSL on top of it fails. Hand the whole
// string to pg untouched.
const isUnixSocket = !!dbUrl && dbUrl.includes('/cloudsql/');

if (dbUrl && isUnixSocket) {
  poolConfig.connectionString = dbUrl;
  poolConfig.ssl = false;
} else if (dbUrl) {
  // Regex to extract: user, password, host, port, and database from connection string
  // This bypasses the default node:url parser which fails when password contains '?' or '$'
  const match = dbUrl.match(/^postgresql:\/\/([^:]+):(.*)@([^:]+):(\d+)\/(.+)$/);
  if (match) {
    const [_, user, password, host, port, database] = match;
    poolConfig.user = user;
    poolConfig.password = password;
    poolConfig.host = host;
    poolConfig.port = parseInt(port, 10);
    poolConfig.database = database;
  } else {
    poolConfig.connectionString = dbUrl;
  }

  // Disable SSL for localhost development, enable SSL with rejectUnauthorized: false for cloud/remote databases.
  // DB_SSL=false also turns it off for a Postgres container on the Docker network (host "db"), which has no SSL.
  if (process.env.DB_SSL === 'false' || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    poolConfig.ssl = false;
  } else {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  console.warn('\x1b[33m%s\x1b[0m', '[DB WARNING] DATABASE_URL is not set in backend/.env. Please create backend/.env with your PostgreSQL credentials.');
}

const pool = new Pool(poolConfig);

module.exports = pool;