
import express from 'express';
import { query } from '../database.js';

const router = express.Router();

router.get('/api/health/db', async (_req, res) => {
  try {              
    const { rows } = await query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    console.error('DB health error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;