import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { query } from './database.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('OK'));
app.get('/api/health/db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    console.error('DB health error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// example resource
app.get('/api/volunteers', async (req, res) => {
  const { skill, location } = req.query;
  const params = [];
  const clauses = [];

  if (skill) { params.push(skill); clauses.push(`$${params.length} = ANY (skills)`); }
  if (location) { params.push(location); clauses.push(`location ILIKE '%' || $${params.length} || '%'`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const { rows } = await query(`SELECT * FROM volunteers ${where} ORDER BY id DESC`, params);
    res.json(rows);
  } catch (err) {
    console.error('fetch volunteers error:', err);
    res.status(500).json({ error: 'failed to fetch volunteers' });
  }
});

app.post('/api/volunteers', async (req, res) => {
  const { name, email, skills = [], location = null, availability = {} } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO volunteers (name, email, skills, location, availability)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, skills, location, availability]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 = unique violation such as duplicate email
    if (err.code === '23505') return res.status(409).json({ error: 'email already exists' });
    console.error('create volunteer error:', err);
    res.status(500).json({ error: 'failed to create volunteer' });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
