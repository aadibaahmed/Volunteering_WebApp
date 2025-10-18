import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  findMatchesForEvent,
  findMatchesForVolunteer,
  assignVolunteerToEvent,
  getAllMatches,
  updateMatchStatus,
  getVolunteerHistory
} from '../volunteer_matching/volunteer_matching.js';

const router = express.Router();

// Get matches for a specific event
router.get('/event/:eventId', requireAuth, (req, res) => {
  try {
    const { eventId } = req.params;
    const eventIdNum = parseInt(eventId);
    
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    const matches = findMatchesForEvent(eventIdNum);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches for event:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Get matches for a specific volunteer
router.get('/volunteer/:volunteerId', requireAuth, (req, res) => {
  try {
    const { volunteerId } = req.params;
    const volunteerIdNum = parseInt(volunteerId);
    
    if (isNaN(volunteerIdNum)) {
      return res.status(400).json({ error: 'Invalid volunteer ID' });
    }
    
    const matches = findMatchesForVolunteer(volunteerIdNum);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches for volunteer:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Get all matches (for managers)
router.get('/all', requireAuth, (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const matches = getAllMatches();
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
    
    const assignment = assignVolunteerToEvent(volunteerId, eventId, notes || '');
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
    
    const updatedMatch = updateMatchStatus(matchIdNum, status);
    res.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({ error: error.message || 'Failed to update match status' });
  }
});

// Get volunteer history
router.get('/history/:volunteerId', requireAuth, (req, res) => {
  try {
    const { volunteerId } = req.params;
    const volunteerIdNum = parseInt(volunteerId);
    
    if (isNaN(volunteerIdNum)) {
      return res.status(400).json({ error: 'Invalid volunteer ID' });
    }
    
    const history = getVolunteerHistory(volunteerIdNum);
    res.json(history);
  } catch (error) {
    console.error('Error getting volunteer history:', error);
    res.status(500).json({ error: 'Failed to get volunteer history' });
  }
});

export default router;
