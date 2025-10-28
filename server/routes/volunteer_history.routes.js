import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getVolunteerHistory } from '../volunteer_matching/volunteer_matching.js';

const router = express.Router();

// Get volunteer history for the authenticated user
router.get('/my-history', requireAuth, (req, res) => {
  try {
    const { sub: userId } = req.user;
    const history = getVolunteerHistory(userId);
    
    // Calculate statistics
    const totalEvents = history.length;
    const completedEvents = history.filter(h => h.status === 'completed').length;
    const pendingEvents = history.filter(h => h.status === 'pending' || h.status === 'assigned').length;
    
    // Calculate total hours (simplified - assuming 8 hours per event)
    const totalHours = completedEvents * 8;
    
    const statistics = {
      totalEvents,
      completedEvents,
      pendingEvents,
      totalHours,
      completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0
    };
    
    res.json({
      history,
      statistics
    });
  } catch (error) {
    console.error('Error getting volunteer history:', error);
    res.status(500).json({ error: 'Failed to get volunteer history' });
  }
});

// Get volunteer history for a specific volunteer (managers only)
router.get('/:volunteerId', requireAuth, (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { volunteerId } = req.params;
    const volunteerIdNum = parseInt(volunteerId);
    
    if (isNaN(volunteerIdNum)) {
      return res.status(400).json({ error: 'Invalid volunteer ID' });
    }
    
    const history = getVolunteerHistory(volunteerIdNum);
    
    // Calculate statistics
    const totalEvents = history.length;
    const completedEvents = history.filter(h => h.status === 'completed').length;
    const pendingEvents = history.filter(h => h.status === 'pending' || h.status === 'assigned').length;
    
    // Calculate total hours (simplified - assuming 8 hours per event)
    const totalHours = completedEvents * 8;
    
    const statistics = {
      totalEvents,
      completedEvents,
      pendingEvents,
      totalHours,
      completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0
    };
    
    res.json({
      history,
      statistics
    });
  } catch (error) {
    console.error('Error getting volunteer history:', error);
    res.status(500).json({ error: 'Failed to get volunteer history' });
  }
});

// Get all volunteer histories (managers only)
router.get('/', requireAuth, (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // This would typically fetch from database
    // For now, return sample data
    const allHistories = [
      {
        volunteerId: 1,
        volunteerName: 'John Doe',
        email: 'john@example.com',
        totalEvents: 5,
        completedEvents: 4,
        totalHours: 32,
        lastActivity: '2024-01-15'
      },
      {
        volunteerId: 2,
        volunteerName: 'Jane Smith',
        email: 'jane@example.com',
        totalEvents: 3,
        completedEvents: 3,
        totalHours: 24,
        lastActivity: '2024-01-18'
      },
      {
        volunteerId: 3,
        volunteerName: 'Mike Johnson',
        email: 'mike@example.com',
        totalEvents: 2,
        completedEvents: 1,
        totalHours: 8,
        lastActivity: '2024-01-20'
      }
    ];
    
    res.json(allHistories);
  } catch (error) {
    console.error('Error getting all volunteer histories:', error);
    res.status(500).json({ error: 'Failed to get volunteer histories' });
  }
});

export default router;
