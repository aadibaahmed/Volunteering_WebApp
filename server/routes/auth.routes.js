import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database.js';

const router = express.Router();
const sign = (u) =>
  jwt.sign({ sub: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '2h' });

router.post('/register', async (req, res) => {
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
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'register failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const { rows } = await query(
      `SELECT id, email, role, password_hash, completed FROM volunteers WHERE email=$1`,
      [email]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign(u);
    res.json({ token, user: { id: u.id, email: u.email, role: u.role, completed: u.completed } });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'login failed' });
  }
});

export default router;

