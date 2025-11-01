import express from "express";
import { pool } from "../database.js"; // your PostgreSQL connection pool
import { requireAuth } from "../middleware/auth.js"; // Adjust path as necessary if auth.js is in another folder

const router = express.Router();

// GET volunteer history (optionally filtered by volunteer_id)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    // If superuser (manager), return all volunteers with their stats
    if (role === 'superuser') {
      const query = `
        SELECT 
          uc.user_id AS "volunteerId",
          COALESCE(
            CONCAT_WS(' ', up.first_name, up.last_name),
            uc.email
          ) AS "volunteerName",
          uc.email,
          COALESCE(stats.total_events, 0) AS "totalEvents",
          COALESCE(stats.completed_events, 0) AS "completedEvents",
          COALESCE(stats.total_hours, 0) AS "totalHours",
          COALESCE(stats.last_activity::text, 'N/A') AS "lastActivity"
        FROM user_credentials uc
        LEFT JOIN user_profile up ON uc.user_id = up.user_id
        LEFT JOIN (
          SELECT 
            vvh.user_id,
            COUNT(*)::int AS total_events,
            COUNT(*) FILTER (WHERE vvh.status ILIKE 'completed')::int AS completed_events,
            COALESCE(SUM(vvh.hours_served), 0)::numeric AS total_hours,
            MAX(vvh.participation_date) AS last_activity
          FROM v_volunteer_history vvh
          GROUP BY vvh.user_id
        ) stats ON uc.user_id = stats.user_id
        WHERE uc.role = 'user' AND uc.is_active = TRUE
        ORDER BY uc.user_id ASC
      `;

      const result = await pool.query(query);
      
      // if no results, return empty array
      if (result.rows.length === 0) {
        return res.json([]);
      }

      return res.json(result.rows);
    }
    
    // Otherwise, return current user's volunteer history
    const volunteerId = req.user.sub;
    const query = `
      SELECT 
        h.history_id AS id,
        h.participation_date AS start,
        h.participation_date AS end,
        h.task_description AS role,
        e.name AS organization
      FROM volunteer_history h
      JOIN events e ON h.event_id = e.event_id
      WHERE h.user_id = $1 
      ORDER BY h.participation_date DESC;
    `;

    const result = await pool.query(query, [volunteerId]);

    // if no results, return a friendly message
    if (result.rows.length === 0) {
      return res.json({ message: "No volunteer history found." });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching volunteer history:", err);
    res.status(500).json({ error: "Failed to fetch volunteer history" });
  }
});

export default router;
