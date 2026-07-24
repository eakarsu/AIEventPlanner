'use strict';

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Runtime administrator credentials are required');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'planner',
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'planner';
    CREATE TABLE IF NOT EXISTS ai_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      analysis_type VARCHAR(100),
      event_id INTEGER,
      content TEXT,
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, name = EXCLUDED.name, role = 'admin'`,
    [email, hash, 'Runtime Administrator']
  );
  await pool.end();
}

main().catch((error) => {
  console.error(`Runtime database initialization failed: ${error.message}`);
  process.exitCode = 1;
});
