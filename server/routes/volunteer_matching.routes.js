// Volunteer Matching Module
// Implements logic to match volunteers to events based on their profiles and event requirements

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../database.js';

// ============================================================================
// BUSINESS LOGIC FUNCTIONS
// ============================================================================

// Helper function to get all volunteers with their skills, availability, and preferences
async function getAllVolunteers() {
  try {
    const result = await pool.query(`
      SELECT 
        uc.user_id AS id,
        uc.email,
        COALESCE(up.first_name, '') AS first_name,
        COALESCE(up.last_name, '') AS last_name,
        COALESCE(up.city, '') AS city,
        COALESCE(up.state_code, '') AS state_code,
        COALESCE(up.preferences, ARRAY[]::text[]) AS preferences,
        COALESCE(up.completed, false) AS completed
      FROM user_credentials uc
      LEFT JOIN user_profile up ON uc.user_id = up.user_id
      WHERE uc.role = 'user' AND uc.is_active = TRUE
    `);

    // Get skills and availability for each volunteer
    const volunteers = [];
    for (const row of result.rows) {
      // Get skills
      const skillsResult = await pool.query(`
        SELECT s.name
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE us.user_id = $1
        ORDER BY s.name
      `, [row.id]);

      // Get availability
      const availResult = await pool.query(`
        SELECT avail_date
        FROM user_availability
        WHERE user_id = $1
        ORDER BY avail_date
      `, [row.id]);

      volunteers.push({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        city: row.city,
        state_code: row.state_code,
        skills: skillsResult.rows.map(r => r.name),
        availability: availResult.rows.map(r => r.avail_date),
        preferences: row.preferences || [],
        completed: row.completed
      });
    }

    return volunteers;
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}

// Helper function to get all events
async function getAllEvents() {
  try {
    const result = await pool.query(`
      SELECT 
        event_id AS id,
        name,
        event_description AS description,
        location,
        required_skills,
        urgency,
        event_date AS date,
        volunteer_needed AS max_volunteers
      FROM events
      ORDER BY event_date ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      location: row.location || '',
      required_skills: row.required_skills ? row.required_skills.split(',').map(s => s.trim()) : [],
      urgency: row.urgency || 'low',
      date: row.date,
      maxVolunteers: row.max_volunteers || 0
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Helper function to parse skills from comma-separated string or array
function parseSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// Helper function to calculate location proximity score (simple state matching)
function calculateLocationScore(volunteer, event) {
  if (!volunteer.state_code || !event.location) return 0;
  
  // Check if volunteer's state is mentioned in event location
  const eventLocation = event.location.toLowerCase();
  const volunteerState = volunteer.state_code.toLowerCase();
  
  if (eventLocation.includes(volunteerState)) {
    return 10;
  }
  
  return 0;
}

// Calculate match score between volunteer and event
function calculateMatchScore(volunteer, event) {
  let score = 0;
  
  const volunteerSkills = volunteer.skills || [];
  const requiredSkills = parseSkills(event.required_skills || []);
  
  // Skills match (60% of score)
  if (requiredSkills.length > 0) {
    const matchingSkills = requiredSkills.filter(skill => 
      volunteerSkills.some(vs => vs.toLowerCase() === skill.toLowerCase())
    );
    const skillScore = (matchingSkills.length / requiredSkills.length) * 60;
    score += skillScore;
  } else {
    // If no required skills specified, give partial credit
    score += 30;
  }
  
  // Availability match (25% of score)
  const hasAvailability = volunteer.availability && volunteer.availability.includes(event.date);
  if (hasAvailability) {
    score += 25;
  }
  
  // Location proximity (10% of score)
  score += calculateLocationScore(volunteer, event);
  
  // Preferences match (5% of score)
  if (volunteer.preferences && volunteer.preferences.length > 0) {
    const matchingPreferences = volunteer.preferences.filter(pref => {
      const eventDescription = (event.description || '').toLowerCase();
      const eventName = (event.name || '').toLowerCase();
      const prefStr = pref.toLowerCase();
      return eventDescription.includes(prefStr) || eventName.includes(prefStr);
    });
    if (matchingPreferences.length > 0) {
      score += 5;
    }
  }
  
  return Math.round(score);
}

// Find best matches for an event
async function findMatchesForEvent(eventId) {
  try {
    const events = await getAllEvents();
    const event = events.find(e => e.id === parseInt(eventId));
    
    if (!event) {
      console.log(`Event ${eventId} not found`);
      return [];
    }
    
    const volunteers = await getAllVolunteers();
    
    const matches = volunteers
      .filter(volunteer => volunteer.completed)
      .map(volunteer => ({
        volunteer,
        event,
        matchScore: calculateMatchScore(volunteer, event)
      }))
      .filter(match => match.matchScore >= 50) // Minimum 50% match
      .sort((a, b) => b.matchScore - a.matchScore);
    
    return matches;
  } catch (error) {
    console.error('Error finding matches for event:', error);
    return [];
  }
}

// Find best events for a volunteer
async function findMatchesForVolunteer(volunteerId) {
  try {
    const volunteers = await getAllVolunteers();
    const volunteer = volunteers.find(v => v.id === parseInt(volunteerId));
    
    if (!volunteer || !volunteer.completed) {
      console.log(`Volunteer ${volunteerId} not found or not completed`);
      return [];
    }
    
    const events = await getAllEvents();
    
    const matches = events
      .filter(event => {
        // Only show future or current events
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .map(event => ({
        volunteer,
        event,
        matchScore: calculateMatchScore(volunteer, event)
      }))
      .filter(match => match.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore);
    
    return matches;
  } catch (error) {
    console.error('Error finding matches for volunteer:', error);
    return [];
  }
}

// Initialize/create volunteer_matches table if it doesn't exist
async function ensureVolunteerMatchesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS volunteer_matches (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        volunteer_id INTEGER NOT NULL REFERENCES user_credentials(user_id) ON DELETE CASCADE,
        match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
        assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, volunteer_id)
      )
    `);
    
    console.log('volunteer_matches table ensured');
  } catch (error) {
    console.error('Error creating volunteer_matches table:', error);
  }
}

// Assign volunteer to event
async function assignVolunteerToEvent(volunteerId, eventId, notes = '') {
  try {
    await ensureVolunteerMatchesTable();
    
    const volunteers = await getAllVolunteers();
    const events = await getAllEvents();
    
    const volunteer = volunteers.find(v => v.id === parseInt(volunteerId));
    const event = events.find(e => e.id === parseInt(eventId));
    
    if (!volunteer || !event) {
      throw new Error('Volunteer or event not found');
    }
    
    const matchScore = calculateMatchScore(volunteer, event);
    
    // Check if assignment already exists
    const existing = await pool.query(`
      SELECT id FROM volunteer_matches 
      WHERE event_id = $1 AND volunteer_id = $2
    `, [eventId, volunteerId]);
    
    if (existing.rowCount > 0) {
      throw new Error('Volunteer already assigned to this event');
    }
    
    const result = await pool.query(`
      INSERT INTO volunteer_matches (event_id, volunteer_id, match_score, status, notes)
      VALUES ($1, $2, $3, 'assigned', $4)
      RETURNING *
    `, [eventId, volunteerId, matchScore, notes]);
    
    return {
      id: result.rows[0].id,
      eventId: result.rows[0].event_id,
      volunteerId: result.rows[0].volunteer_id,
      matchScore: result.rows[0].match_score,
      status: result.rows[0].status,
      assignedDate: result.rows[0].assigned_date.toISOString().split('T')[0],
      notes: result.rows[0].notes
    };
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    throw error;
  }
}

// Get all matches
async function getAllMatches() {
  try {
    await ensureVolunteerMatchesTable();
    
    const result = await pool.query(`
      SELECT 
        vm.id,
        vm.event_id,
        vm.volunteer_id,
        vm.match_score,
        vm.status,
        vm.assigned_date,
        vm.notes
      FROM volunteer_matches vm
      ORDER BY vm.assigned_date DESC, vm.match_score DESC
    `);

    if (result.rows.length === 0) {
      return [];
    }

    // Fetch volunteers and events to enrich the data
    const volunteers = await getAllVolunteers();
    const events = await getAllEvents();
    
    return result.rows.map(match => {
      const volunteer = volunteers.find(v => v.id === match.volunteer_id);
      const event = events.find(e => e.id === match.event_id);
      
      return {
        id: match.id,
        eventId: match.event_id,
        volunteerId: match.volunteer_id,
        matchScore: match.match_score,
        status: match.status,
        assignedDate: match.assigned_date.toISOString().split('T')[0],
        notes: match.notes,
        volunteer: volunteer ? {
          id: volunteer.id,
          name: `${volunteer.first_name} ${volunteer.last_name}`.trim() || volunteer.email,
          email: volunteer.email,
          skills: volunteer.skills
        } : null,
        event: event ? {
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location
        } : null
      };
    });
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return [];
  }
}

// Update match status
async function updateMatchStatus(matchId, status) {
  try {
    await ensureVolunteerMatchesTable();
    
    const validStatuses = ['assigned', 'pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const result = await pool.query(`
      UPDATE volunteer_matches
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, matchId]);
    
    if (result.rows.length === 0) {
      throw new Error('Match not found');
    }
    
    return {
      id: result.rows[0].id,
      eventId: result.rows[0].event_id,
      volunteerId: result.rows[0].volunteer_id,
      matchScore: result.rows[0].match_score,
      status: result.rows[0].status,
      assignedDate: result.rows[0].assigned_date.toISOString().split('T')[0],
      notes: result.rows[0].notes
    };
  } catch (error) {
    console.error('Error updating match status:', error);
    throw error;
  }
}

// Get volunteer history
async function getVolunteerHistory(volunteerId) {
  try {
    await ensureVolunteerMatchesTable();
    
    const result = await pool.query(`
      SELECT 
        vm.id,
        vm.event_id,
        vm.volunteer_id,
        vm.match_score,
        vm.status,
        vm.assigned_date,
        vm.notes
      FROM volunteer_matches vm
      WHERE vm.volunteer_id = $1
      ORDER BY vm.assigned_date DESC
    `, [volunteerId]);

    if (result.rows.length === 0) {
      return [];
    }

    const events = await getAllEvents();
    
    return result.rows.map(match => {
      const event = events.find(e => e.id === match.event_id);
      return {
        id: match.id,
        eventId: match.event_id,
        volunteerId: match.volunteer_id,
        matchScore: match.match_score,
        status: match.status,
        assignedDate: match.assigned_date.toISOString().split('T')[0],
        notes: match.notes,
        event: event ? {
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          description: event.description
        } : null
      };
    });
  } catch (error) {
    console.error('Error fetching volunteer history:', error);
    return [];
  }
}

// ============================================================================
// ROUTES
// ============================================================================

const router = express.Router();

// Get matches for a specific event
router.get('/event/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventIdNum = parseInt(eventId);
    
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    const matches = await findMatchesForEvent(eventIdNum);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches for event:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Get matches for a specific volunteer
router.get('/volunteer/:volunteerId', requireAuth, async (req, res) => {
  try {
    const { volunteerId } = req.params;
    const volunteerIdNum = parseInt(volunteerId);
    
    if (isNaN(volunteerIdNum)) {
      return res.status(400).json({ error: 'Invalid volunteer ID' });
    }
    
    const matches = await findMatchesForVolunteer(volunteerIdNum);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches for volunteer:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Get all matches (for managers)
router.get('/all', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const matches = await getAllMatches();
    res.json(matches);
  } catch (error) {
    console.error('Error getting all matches:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// Assign volunteer to event
router.post('/assign', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { volunteerId, eventId, notes } = req.body;
    
    // Validation
    if (!volunteerId || !eventId) {
      return res.status(400).json({ error: 'volunteerId and eventId are required' });
    }
    
    if (typeof volunteerId !== 'number' || typeof eventId !== 'number') {
      return res.status(400).json({ error: 'volunteerId and eventId must be numbers' });
    }
    
    if (notes && typeof notes !== 'string') {
      return res.status(400).json({ error: 'notes must be a string' });
    }
    
    const assignment = await assignVolunteerToEvent(volunteerId, eventId, notes || '');
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    res.status(500).json({ error: error.message || 'Failed to assign volunteer' });
  }
});

// Update match status
router.put('/:matchId/status', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;
    
    const matchIdNum = parseInt(matchId);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required and must be a string' });
    }
    
    const validStatuses = ['assigned', 'pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    
    const updatedMatch = await updateMatchStatus(matchIdNum, status);
    res.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({ error: error.message || 'Failed to update match status' });
  }
});

// Get volunteer history
router.get('/history/:volunteerId', requireAuth, async (req, res) => {
  try {
    const { volunteerId } = req.params;
    const volunteerIdNum = parseInt(volunteerId);
    
    if (isNaN(volunteerIdNum)) {
      return res.status(400).json({ error: 'Invalid volunteer ID' });
    }
    
    const history = await getVolunteerHistory(volunteerIdNum);
    res.json(history);
  } catch (error) {
    console.error('Error getting volunteer history:', error);
    res.status(500).json({ error: 'Failed to get volunteer history' });
  }
});

// Generate matches for an event (finds best volunteers but doesn't assign)
router.post('/generate/:eventId', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { eventId } = req.params;
    const eventIdNum = parseInt(eventId);
    
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    const matches = await findMatchesForEvent(eventIdNum);
    res.json(matches);
  } catch (error) {
    console.error('Error generating matches:', error);
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

export default router;
