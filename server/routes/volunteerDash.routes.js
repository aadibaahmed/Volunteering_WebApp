import express from 'express';
import { pool } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET volunteer dashboard data for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.sub;

  try {
    const [profileRes, unreadRes, upcomingRes, histRes, statsRes] = await Promise.all([
      pool.query(
        `SELECT user_id, first_name, last_name, address1, address2, city, state_code, zip_code, preferences, completed
         FROM user_profile
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS unread
         FROM notifications
         WHERE user_id = $1 AND unread = TRUE`,
        [userId]
      ),
      pool.query(
        `SELECT 
            e.event_id,
            e.name,
            e.location,
            e.event_date,
            e.time_start,
            e.urgency,
            vs.signup_status
         FROM volunteer_signups vs
         JOIN events e ON e.event_id = vs.event_id
         WHERE vs.user_id = $1 AND e.event_date >= CURRENT_DATE
         ORDER BY e.event_date ASC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT 
            history_id,
            participation_date,
            task_description,
            hours_served,
            status,
            event_id,
            event_name
         FROM v_volunteer_history
         WHERE user_id = $1
         ORDER BY participation_date DESC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT 
            COUNT(*)::int AS total_events,
            COUNT(*) FILTER (WHERE status ILIKE 'completed')::int AS completed_events,
            COALESCE(SUM(hours_served), 0)::numeric AS total_hours
         FROM v_volunteer_history
         WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const stats = statsRes.rows[0] || { total_events: 0, completed_events: 0, total_hours: 0 };
    const completionRate = stats.total_events > 0
      ? Math.round((stats.completed_events / stats.total_events) * 100)
      : 0;

    res.json({
      profile: profileRes.rows[0] || null,
      notifications: { unread: unreadRes.rows[0]?.unread ?? 0 },
      upcomingEvents: upcomingRes.rows,
      recentHistory: histRes.rows,
      statistics: {
        totalEvents: stats.total_events,
        completedEvents: stats.completed_events,
        totalHours: Number(stats.total_hours),
        completionRate,
      },
    });
  } catch (err) {
    console.error('volunteer dashboard error:', err);
    res.status(500).json({ error: 'Failed to load volunteer dashboard' });
  }
});

export default router;


