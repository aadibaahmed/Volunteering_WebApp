import express from 'express';
import { pool } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

console.log("volunteerDash.routes.js loaded");


// GET volunteer dashboard data for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.sub;

  console.log("🔍 Volunteer Dashboard Hit");
  console.log("Authenticated User ID:", userId);


  try {

    console.log("Running volunteer dashboard queries...");

    // Query 6 is added here to run concurrently
    const [profileRes, unreadRes, upcomingRes, histRes, statsRes, activeOpportunitiesRes] = await Promise.all([
      
      // Query 1: Profile
      pool.query(
        `SELECT user_id, first_name, last_name, address1, address2, city, state_code, zip_code, preferences, completed
         FROM user_profile
         WHERE user_id = $1`,
        [userId]
      ),
      // Query 2: Unread Notifications
      pool.query(
        `SELECT COUNT(*)::int AS unread
         FROM notifications
         WHERE user_id = $1 AND unread = TRUE`,
        [userId]
      ),
      // Query 3: Upcoming Events List (USER-SPECIFIC)
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
         WHERE vs.user_id = $1 
           AND e.event_date >= CURRENT_DATE
           AND vs.signup_status IN ('confirmed', 'pending', 'signed_up') 
         ORDER BY e.event_date ASC
         LIMIT 5`,
        [userId]
      ),
      // Query 4: Recent History List
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
      // Query 5: Volunteer Statistics - FIX: Included 'unknown' status
      pool.query(
      `SELECT 
        COUNT(event_id)::int AS total_events, 
        COUNT(event_id) FILTER (WHERE status ILIKE 'completed' OR status ILIKE 'unknown')::int AS completed_events,
        COALESCE(SUM(hours_served) FILTER (WHERE status ILIKE 'completed' OR status ILIKE 'unknown'), 0)::numeric AS total_hours
      FROM v_volunteer_history
      WHERE user_id = $1;`,
        [userId]
      ),
      //Query 6: Total Active/Future Opportunities (GLOBAL COUNT)
      pool.query(
        `SELECT 
          COUNT(event_id)::int AS total_active_opportunities
        FROM events
        WHERE event_date >= CURRENT_DATE;`
      ),
    ]);
    
    // --- Data Extraction and Processing ---
    
    console.log("Stats Query Raw Result:", statsRes.rows);
    
    const stats = statsRes.rows[0] || { total_events: 0, completed_events: 0, total_hours: 0 };
    
    const totalHours = Number(stats.total_hours);

    console.log("Parsed totalHours:", totalHours);

    const completionRate = stats.total_events > 0
      ? Math.round((stats.completed_events / stats.total_events) * 100)
      : 0;

    // Extracting the global active opportunities count
    const totalActiveOpportunities = activeOpportunitiesRes.rows[0]?.total_active_opportunities ?? 0;
    
    res.json({
      profile: profileRes.rows[0] || null,
      notifications: { unread: unreadRes.rows[0]?.unread ?? 0 },
      upcomingEvents: upcomingRes.rows, // User's upcoming events (limited to 5)
      recentHistory: histRes.rows,
      statistics: {
        totalEvents: stats.total_events,
        completedEvents: stats.completed_events,
        totalHours: totalHours, 
        completionRate,
      },
      // 🆕 New object to clearly separate the two counts for the frontend
      dashboardCounts: {
          upcomingSignedUp: upcomingRes.rows.length, // From Query 3: User's signed-up, future events
          totalActive: totalActiveOpportunities,     // From Query 6: ALL future events
      }
    });
  } catch (err) {
    console.error('volunteer dashboard error:', err);
    res.status(500).json({ error: 'Failed to load volunteer dashboard' });
  }
});

export default router;