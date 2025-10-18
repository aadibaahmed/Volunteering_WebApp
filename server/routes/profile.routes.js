import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Hardcoded volunteer profiles data (no database implementation)
let volunteerProfiles = [
  {
    id: 1,
    email: 'admin@volunteer.com',
    role: 'superuser',
    first_name: 'Admin',
    last_name: 'User',
    address1: '123 Admin St',
    address2: null,
    city: 'Admin City',
    state_code: 'AC',
    zip_code: '12345',
    preferences: ['Management', 'Leadership'],
    skills: ['Management', 'Leadership', 'Organization'],
    availability: ['2024-01-20', '2024-01-21', '2024-01-22'],
    completed: true
  },
  {
    id: 2,
    email: 'volunteer@volunteer.com',
    role: 'user',
    first_name: 'John',
    last_name: 'Doe',
    address1: '456 Volunteer Ave',
    address2: 'Apt 2B',
    city: 'Volunteer City',
    state_code: 'VC',
    zip_code: '67890',
    preferences: ['Education', 'Healthcare'],
    skills: ['First Aid', 'CPR', 'Teaching'],
    availability: ['2024-01-18', '2024-01-19', '2024-01-20'],
    completed: true
  }
];

router.get('/me', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const profile = volunteerProfiles.find(p => p.id === userId);
    res.json(profile || null);
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
    const profileIndex = volunteerProfiles.findIndex(p => p.id === userId);
    if (profileIndex === -1) {
      return res.status(404).json({ error: 'profile not found' });
    }

    // Update profile
    volunteerProfiles[profileIndex] = {
      ...volunteerProfiles[profileIndex],
      first_name,
      last_name,
      address1,
      address2: address2 || null,
      city,
      state_code,
      zip_code,
      preferences: preferences || null
    };

    res.json({
      id: volunteerProfiles[profileIndex].id,
      email: volunteerProfiles[profileIndex].email,
      first_name: volunteerProfiles[profileIndex].first_name,
      last_name: volunteerProfiles[profileIndex].last_name,
      completed: volunteerProfiles[profileIndex].completed
    });
  } catch (err) {
    console.error('profile save error:', err);
    res.status(500).json({ error: 'profile save failed' });
  }
});

router.put('/skills', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  const skills = Array.isArray(req.body) ? req.body.map(String) : [];
  try {
    const profileIndex = volunteerProfiles.findIndex(p => p.id === userId);
    if (profileIndex === -1) {
      return res.status(404).json({ error: 'profile not found' });
    }

    volunteerProfiles[profileIndex].skills = skills;
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
    const profileIndex = volunteerProfiles.findIndex(p => p.id === userId);
    if (profileIndex === -1) {
      return res.status(404).json({ error: 'profile not found' });
    }

    volunteerProfiles[profileIndex].availability = dates;
    res.json({ ok: true, count: dates.length });
  } catch (err) {
    console.error('availability update error:', err);
    res.status(500).json({ error: 'availability update failed' });
  }
});

router.post('/complete', requireAuth, async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const profileIndex = volunteerProfiles.findIndex(p => p.id === userId);
    if (profileIndex === -1) {
      return res.status(404).json({ error: 'profile not found' });
    }

    const profile = volunteerProfiles[profileIndex];
    
    // Validation: Check if profile has skills and availability
    if (!profile.skills || profile.skills.length === 0) {
      return res.status(400).json({
        error: 'Please add at least one skill before completing your profile.'
      });
    }
    
    if (!profile.availability || profile.availability.length === 0) {
      return res.status(400).json({
        error: 'Please add at least one availability date before completing your profile.'
      });
    }

    volunteerProfiles[profileIndex].completed = true;
    res.json({
      id: profile.id,
      completed: true
    });
  } catch (err) {
    console.error('complete profile error:', err);
    res.status(500).json({ error: 'failed to complete profile' });
  }
});

export default router;
