const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  ssl: { rejectUnauthorized: false }
};

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
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
}

const pool = new Pool(poolConfig);

module.exports = pool;