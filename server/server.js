import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './database.js';

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'invalid token' }); }
}

const sign = (u) =>
  jwt.sign({ sub: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '2h' });

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

app.post('/api/auth/register', async (req, res) => {
  const { email, password, role = 'volunteer' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  try {
    const exists = await query('SELECT 1 FROM volunteers WHERE email=$1', [email]);
    if (exists.rowCount) return res.status(409).json({ error: 'email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO volunteers (email, password_hash, role, completed)
       VALUES ($1,$2,$3,false)
       RETURNING id, email, role, completed`,
      [email, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const { rows } = await query(
      `SELECT id, email, role, password_hash, completed
         FROM volunteers WHERE email=$1`,
      [email]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign(u);
    res.json({ token, user: { id: u.id, email: u.email, role: u.role, completed: u.completed } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'login failed' });
  }
});

app.get('/api/profile/me', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const { rows } = await query(
      `SELECT id, email, role, first_name, last_name, address1, address2, city,
              state_code, zip_code, preferences, skills, availability, completed
         FROM volunteers WHERE id=$1`,
      [userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('profile/me error:', err);
    res.status(500).json({ error: 'failed to fetch profile' });
  }
});

app.post('/api/profile', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const {
    first_name, last_name, address1, address2, city,
    state_code, zip_code, preferences
  } = req.body || {};

  if (!first_name || !last_name || !address1 || !city || !state_code || !zip_code)
    return res.status(400).json({ error: 'missing required profile fields' });

  try {
    const { rows } = await query(
      `UPDATE volunteers
          SET first_name=$2, last_name=$3, address1=$4, address2=$5, city=$6,
              state_code=$7, zip_code=$8, preferences=$9
        WHERE id=$1
        RETURNING id, email, first_name, last_name, completed`,
      [userId, first_name, last_name, address1, address2 || null, city, state_code, zip_code, preferences || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('profile save error:', err);
    res.status(500).json({ error: 'profile save failed' });
  }
});


app.put('/api/profile/skills', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const skills = Array.isArray(req.body) ? req.body.map(String) : [];
  try {
    await query(`UPDATE volunteers SET skills=$2::text[] WHERE id=$1`, [userId, skills]);
    res.json({ ok: true, count: skills.length });
  } catch (err) {
    console.error('skills update error:', err);
    res.status(500).json({ error: 'skills update failed' });
  }
});

app.put('/api/profile/availability', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const dates = Array.isArray(req.body) ? req.body : [];
  try {
    await query(`UPDATE volunteers SET availability=$2::date[] WHERE id=$1`, [userId, dates]);
    res.json({ ok: true, count: dates.length });
  } catch (err) {
    console.error('availability update error:', err);
    res.status(500).json({ error: 'availability update failed' });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

app.post('/api/profile/complete', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const { rows } = await query(
      `UPDATE volunteers
         SET completed = true
       WHERE id=$1
       RETURNING id, completed`,
      [userId]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23514') {
      return res.status(400).json({
        error: 'Please add at least one skill and one availability date before completing your profile.'
      });
    }
    console.error('complete profile error:', err);
    res.status(500).json({ error: 'failed to complete profile' });
  }
});

