import express from 'express';
import { query } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const { rows } = await query(
      `SELECT id, email, role, first_name, last_name, address1, address2, city,
              state_code, zip_code, preferences, skills, availability, completed
         FROM volunteers
        WHERE id=$1`,
      [userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('profile/me error:', err);
    res.status(500).json({ error: 'failed to fetch profile' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const {
    first_name, last_name, address1, address2, city,
    state_code, zip_code, preferences
  } = req.body || {};

  if (!first_name || !last_name || !address1 || !city || !state_code || !zip_code) {
    return res.status(400).json({ error: 'missing required profile fields' });
  }

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

router.put('/skills', requireAuth, async (req, res) => {
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

router.put('/availability', requireAuth, async (req, res) => {
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

router.post('/complete', requireAuth, async (req, res) => {
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

export default router;
