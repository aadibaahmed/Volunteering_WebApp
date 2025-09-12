import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ca = fs.readFileSync(path.join(__dirname, 'rds-global-bundle.pem'), 'utf8');
const dbUrl = new URL(process.env.DATABASE_URL);

export const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '5432', 10),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),
  ssl: { require: true, rejectUnauthorized: true, ca: [ca], servername: dbUrl.hostname },
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 7_000,
});

pool.on('connect', () => console.log('database connected'));
pool.on('error', (err) => console.error('pool error:', err));

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

process.on('SIGINT', async () => {
  try { await pool.end(); } finally { process.exit(0); }
});
