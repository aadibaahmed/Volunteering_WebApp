import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../database.js';

const router = express.Router();

// GET current user's profile (with skills and availability)
router.get('/me', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const [profileRes, skillsRes, availRes] = await Promise.all([
      pool.query(
        `SELECT user_id, first_name, last_name, address1, address2, city, state_code, zip_code, preferences, completed
         FROM user_profile WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT s.name
         FROM user_skills us
         JOIN skills s ON s.skill_id = us.skill_id
         WHERE us.user_id = $1
         ORDER BY s.name`,
        [userId]
      ),
      pool.query(
        `SELECT avail_date FROM user_availability WHERE user_id = $1 ORDER BY avail_date`,
        [userId]
      ),
    ]);

    if (profileRes.rows.length === 0) {
      return res.json(null);
    }

    const profile = profileRes.rows[0];
    profile.skills = skillsRes.rows.map(r => r.name);
    profile.availability = availRes.rows.map(r => r.avail_date);
    return res.json(profile);
  } catch (err) {
    console.error('profile/me error:', err);
    return res.status(500).json({ error: 'failed to fetch profile' });
  }
});

// Create or update profile
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
    const result = await pool.query(
      `INSERT INTO user_profile (
         user_id, first_name, last_name, address1, address2, city, state_code, zip_code, preferences, completed
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE((SELECT completed FROM user_profile WHERE user_id=$1), false)
       )
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         address1 = EXCLUDED.address1,
         address2 = EXCLUDED.address2,
         city = EXCLUDED.city,
         state_code = EXCLUDED.state_code,
         zip_code = EXCLUDED.zip_code,
         preferences = EXCLUDED.preferences
       RETURNING user_id, first_name, last_name, completed`,
      [userId, first_name, last_name, address1, address2 || null, city, state_code, zip_code, preferences || null]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('profile save error:', err);
    return res.status(500).json({ error: 'profile save failed' });
  }
});

// Replace skills list with provided names (creates skills as needed)
router.put('/skills', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const skills = Array.isArray(req.body) ? req.body.map(s => String(s).trim()).filter(Boolean) : [];

  try {
    await pool.query('BEGIN');

    // Resolve or create skill ids
    const skillIds = [];
    for (const name of skills) {
      const upsert = await pool.query(
        `INSERT INTO skills (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING skill_id`,
        [name]
      );
      skillIds.push(upsert.rows[0].skill_id);
    }

    // Replace user skills
    await pool.query(`DELETE FROM user_skills WHERE user_id = $1`, [userId]);
    for (const sid of skillIds) {
      await pool.query(`INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2)`, [userId, sid]);
    }

    await pool.query('COMMIT');
    return res.json({ ok: true, count: skillIds.length });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('skills update error:', err);
    return res.status(500).json({ error: 'skills update failed' });
  }
});

// Replace availability with provided ISO dates
router.put('/availability', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const dates = Array.isArray(req.body) ? req.body : [];
  try {
    await pool.query('BEGIN');
    await pool.query(`DELETE FROM user_availability WHERE user_id = $1`, [userId]);
    for (const iso of dates) {
      await pool.query(`INSERT INTO user_availability (user_id, avail_date) VALUES ($1, $2)`, [userId, iso]);
    }
    await pool.query('COMMIT');
    return res.json({ ok: true, count: dates.length });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('availability update error:', err);
    return res.status(500).json({ error: 'availability update failed' });
  }
});

// Mark profile as completed (validates skills and availability exist)
router.post('/complete', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const [skills, avail] = await Promise.all([
      pool.query(`SELECT 1 FROM user_skills WHERE user_id=$1 LIMIT 1`, [userId]),
      pool.query(`SELECT 1 FROM user_availability WHERE user_id=$1 LIMIT 1`, [userId]),
    ]);

    if (skills.rowCount === 0) {
      return res.status(400).json({ error: 'Please add at least one skill before completing your profile.' });
    }
    if (avail.rowCount === 0) {
      return res.status(400).json({ error: 'Please add at least one availability date before completing your profile.' });
    }

    const upd = await pool.query(
      `INSERT INTO user_profile (user_id, first_name, last_name, address1, city, state_code, zip_code, completed)
       VALUES ($1, '', '', '', '', 'CA', '00000', TRUE)
       ON CONFLICT (user_id) DO UPDATE SET completed = TRUE
       RETURNING user_id, completed`,
      [userId]
    );

    return res.json({ id: upd.rows[0].user_id, completed: upd.rows[0].completed });
  } catch (err) {
    console.error('complete profile error:', err);
    return res.status(500).json({ error: 'failed to complete profile' });
  }
});

export default router;
