import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Create a new volunteer (manager only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email & password required' });
    }

    // Check if email already exists
    const exists = await pool.query(
      `SELECT 1 FROM user_credentials WHERE email = $1`,
      [email]
    );
    
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'user already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Create user with role 'user' (volunteer)
    const result = await pool.query(
      `INSERT INTO user_credentials (email, password_hash, role, is_active)
       VALUES ($1, $2, 'user', TRUE)
       RETURNING user_id, email, role`,
      [email, hash]
    );

    const userRow = result.rows[0];
    
    return res.status(201).json({
      message: 'Volunteer created successfully',
      volunteer: {
        volunteerId: userRow.user_id,
        email: userRow.email,
        role: userRow.role
      }
    });
  } catch (err) {
    console.error('Error creating volunteer:', err);
    return res.status(500).json({ error: 'Failed to create volunteer' });
  }
});

// Update volunteer (email, password, and/or profile) (manager only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { 
      email, 
      password,
      first_name,
      last_name,
      address1,
      address2,
      city,
      state_code,
      zip_code,
      preferences,
      skills,
      availability
    } = req.body || {};

    // Check if volunteer exists
    const exists = await pool.query(
      `SELECT user_id FROM user_credentials WHERE user_id = $1 AND role = 'user'`,
      [id]
    );

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    await pool.query('BEGIN');

    try {
      // Update user_credentials if email or password provided
      if (email || password) {
        // If email is provided, check if it's already taken by another user
        if (email) {
          const emailExists = await pool.query(
            `SELECT user_id FROM user_credentials WHERE email = $1 AND user_id != $2`,
            [email, id]
          );
          
          if (emailExists.rowCount > 0) {
            await pool.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already in use' });
          }
        }

        // Build update query for credentials
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (email) {
          updates.push(`email = $${paramIndex}`);
          values.push(email);
          paramIndex++;
        }

        if (password) {
          const hash = await bcrypt.hash(password, 10);
          updates.push(`password_hash = $${paramIndex}`);
          values.push(hash);
          paramIndex++;
        }

        if (updates.length > 0) {
          values.push(id);
          const updateQuery = `
            UPDATE user_credentials
            SET ${updates.join(', ')}
            WHERE user_id = $${paramIndex}
          `;
          await pool.query(updateQuery, values);
        }
      }

      // Update user_profile if profile data provided
      if (first_name !== undefined || last_name !== undefined || address1 !== undefined || 
          city !== undefined || state_code !== undefined || zip_code !== undefined || 
          preferences !== undefined) {
        
        const profileData = {
          user_id: id,
          first_name: first_name || null,
          last_name: last_name || null,
          address1: address1 || null,
          address2: address2 || null,
          city: city || null,
          state_code: state_code || null,
          zip_code: zip_code || null,
          preferences: preferences || null
        };

        await pool.query(
          `INSERT INTO user_profile (
             user_id, first_name, last_name, address1, address2, city, state_code, zip_code, preferences, completed
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE((SELECT completed FROM user_profile WHERE user_id=$1), false)
           )
           ON CONFLICT (user_id) DO UPDATE SET
             first_name = COALESCE(EXCLUDED.first_name, user_profile.first_name),
             last_name = COALESCE(EXCLUDED.last_name, user_profile.last_name),
             address1 = COALESCE(EXCLUDED.address1, user_profile.address1),
             address2 = COALESCE(EXCLUDED.address2, user_profile.address2),
             city = COALESCE(EXCLUDED.city, user_profile.city),
             state_code = COALESCE(EXCLUDED.state_code, user_profile.state_code),
             zip_code = COALESCE(EXCLUDED.zip_code, user_profile.zip_code),
             preferences = COALESCE(EXCLUDED.preferences, user_profile.preferences)`,
          [profileData.user_id, profileData.first_name, profileData.last_name, 
           profileData.address1, profileData.address2, profileData.city, 
           profileData.state_code, profileData.zip_code, profileData.preferences]
        );
      }

      // Update skills if provided
      if (Array.isArray(skills)) {
        // Delete existing skills
        await pool.query(`DELETE FROM user_skills WHERE user_id = $1`, [id]);
        
        // Resolve or create skill ids and add them
        for (const skillName of skills) {
          if (!skillName || !skillName.trim()) continue;
          
          const upsert = await pool.query(
            `INSERT INTO skills (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING skill_id`,
            [skillName.trim()]
          );
          
          await pool.query(
            `INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, upsert.rows[0].skill_id]
          );
        }
      }

      // Update availability if provided
      if (Array.isArray(availability)) {
        // Delete existing availability
        await pool.query(`DELETE FROM user_availability WHERE user_id = $1`, [id]);
        
        // Add new availability dates
        for (const date of availability) {
          if (date) {
            await pool.query(
              `INSERT INTO user_availability (user_id, avail_date) VALUES ($1, $2)`,
              [id, date]
            );
          }
        }
      }

      await pool.query('COMMIT');
      
      return res.json({
        message: 'Volunteer updated successfully'
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error updating volunteer:', err);
    return res.status(500).json({ error: 'Failed to update volunteer' });
  }
});

// Delete volunteer (deactivate - set is_active to false) (manager only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    // Check if volunteer exists
    const exists = await pool.query(
      `SELECT user_id FROM user_credentials WHERE user_id = $1 AND role = 'user'`,
      [id]
    );

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Deactivate volunteer instead of deleting
    await pool.query(
      `UPDATE user_credentials SET is_active = FALSE WHERE user_id = $1`,
      [id]
    );

    return res.json({ message: 'Volunteer deactivated successfully' });
  } catch (err) {
    console.error('Error deleting volunteer:', err);
    return res.status(500).json({ error: 'Failed to delete volunteer' });
  }
});

// Get volunteer profile information (user_profile table data) (manager only)
router.get('/:id/profile', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    // Get user credentials and profile
    const result = await pool.query(
      `SELECT 
        uc.user_id,
        uc.email,
        uc.role,
        up.first_name,
        up.last_name,
        up.address1,
        up.address2,
        up.city,
        up.state_code,
        up.zip_code,
        up.preferences,
        up.completed
       FROM user_credentials uc
       LEFT JOIN user_profile up ON uc.user_id = up.user_id
       WHERE uc.user_id = $1 AND uc.role = 'user'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Get skills
    const skillsResult = await pool.query(
      `SELECT s.name
       FROM user_skills us
       JOIN skills s ON s.skill_id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [id]
    );

    // Get availability
    const availabilityResult = await pool.query(
      `SELECT avail_date FROM user_availability WHERE user_id = $1 ORDER BY avail_date`,
      [id]
    );

    const volunteer = result.rows[0];
    volunteer.skills = skillsResult.rows.map(r => r.name);
    volunteer.availability = availabilityResult.rows.map(r => r.avail_date);

    return res.json(volunteer);
  } catch (err) {
    console.error('Error fetching volunteer profile:', err);
    return res.status(500).json({ error: 'Failed to fetch volunteer profile' });
  }
});

export default router;

