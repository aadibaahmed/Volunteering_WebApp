import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../database.js';

dotenv.config();
const router = express.Router();

const sign = (u) =>
  jwt.sign(
    { sub: u.user_id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email & password required' });

  try {
    const { rows } = await query(
      `SELECT user_id, email, password, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign(user);

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'login failed' });
  }
});

export default router;
