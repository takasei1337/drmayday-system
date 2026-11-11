const { Pool } = require('pg');
require('./env');

const connectionString =
  process.env.MAIN_DATABASE_URL ||
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable`;

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Main DB Error] Lỗi kết nối CSDL chung:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
