import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from '../database.js';

dotenv.config();
const router = express.Router();

const sign = (u) =>
  jwt.sign(
    { sub: u.user_id, email: u.email, role: u.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '2h' }
  );

// User Registration -> inserts into user_credentials
router.post('/register', async (req, res) => {
  const { email, password, role = 'user' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });

  try {
    // Ensure email unique
    const exists = await pool.query(`SELECT 1 FROM user_credentials WHERE email = $1`, [email]);
    if (exists.rowCount > 0) return res.status(409).json({ error: 'user already exists' });

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      `INSERT INTO user_credentials (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING user_id, email, role`,
      [email, hash, role]
    );

    const userRow = ins.rows[0];
    const token = sign(userRow);
    return res.status(201).json({
      token,
      user: {
        id: userRow.user_id,
        email: userRow.email,
        role: userRow.role,
      },
    });
  } catch (err) {
    console.error('registration error:', err);
    return res.status(500).json({ error: 'registration failed' });
  }
});

// Login -> validates against user_credentials
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });

  try {
    const sel = await pool.query(
      `SELECT user_id, email, password_hash, role, is_active FROM user_credentials WHERE email = $1`,
      [email]
    );
    if (sel.rowCount === 0) return res.status(401).json({ error: 'invalid credentials' });

    const userRow = sel.rows[0];
    if (userRow.is_active === false) return res.status(403).json({ error: 'account disabled' });

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign(userRow);
    return res.json({
      token,
      user: {
        id: userRow.user_id,
        email: userRow.email,
        role: userRow.role,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'login failed' });
  }
});

export default router;
