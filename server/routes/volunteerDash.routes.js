import express from "express";
import { pool } from "../database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const firstNameFromToken = req.user.first_name || "Volunteer";
  const lastNameFromToken = req.user.last_name || "User";

  let totalHours = 0;
  let totalVolunteers = 0;
  let pendingApprovals = 0;
  let firstName = firstNameFromToken;
  let lastName = lastNameFromToken;
  let upcomingEventsForUser = 0;
  let activeOpportunities = 0;

  try {
    // 1️⃣ Count all active opportunities
    try {
      const result = await pool.query(
        'SELECT COUNT(*) AS "activeOpportunities" FROM events WHERE event_date >= CURRENT_DATE'
      );
      if (result.rows?.length > 0) {
        activeOpportunities = parseInt(result.rows[0].activeOpportunities || "0", 10);
      }
    } catch (err) {
      console.error("SQL Error (active opportunities):", err.message);
      activeOpportunities = 0;
    }

    // 2️⃣ Get user profile
    const profileQuery = await pool.query(
      `SELECT uc.user_id, up.first_name, up.last_name
         FROM user_credentials uc
         LEFT JOIN user_profile up ON uc.user_id = up.user_id
        WHERE uc.user_id = $1`,
      [userId]
    );
    const profile = profileQuery.rows[0];

    if (profile) {
      firstName = profile.first_name || firstNameFromToken;
      lastName = profile.last_name || lastNameFromToken;

      // 3️⃣ Get personal stats
      const [hoursResult, completedEvents, pending, upcoming] = await Promise.all([
        pool.query(
          'SELECT COALESCE(SUM(hours_served), 0) AS "totalHours" FROM volunteer_history WHERE user_id = $1',
          [userId]
        ),
        pool.query(
          'SELECT COUNT(DISTINCT event_id) AS "eventsVolunteered" FROM volunteer_history WHERE user_id = $1',
          [userId]
        ),
        pool.query(
          'SELECT COUNT(*) AS "pendingApprovals" FROM volunteer_signups WHERE user_id = $1 AND signup_status = $2',
          [userId, "SignedUp"]
        ),
        pool.query(
          `SELECT COUNT(DISTINCT vs.event_id) AS "upcoming"
           FROM volunteer_signups vs
           JOIN events e ON vs.event_id = e.event_id
          WHERE vs.user_id = $1 AND e.event_date >= CURRENT_DATE`,
          [userId]
        ),
      ]);

      totalHours = parseFloat(hoursResult.rows[0].totalHours || "0");
      totalVolunteers = parseInt(completedEvents.rows[0].eventsVolunteered || "0", 10);
      pendingApprovals = parseInt(pending.rows[0].pendingApprovals || "0", 10);
      upcomingEventsForUser = parseInt(upcoming.rows[0].upcoming || "0", 10);
    }

    // 4️⃣ Return consistent response
    res.status(200).json({
      firstName,
      lastName,
      totalHours,
      totalVolunteers,
      totalEvents: upcomingEventsForUser,
      activeOpportunities,
      pendingApprovals,
    });
  } catch (err) {
    console.error("Dashboard Route Error (Fatal):", err.message);
    res
      .status(500)
      .json({
        error:
          "Failed to fetch volunteer dashboard data due to a critical server error.",
      });
  }
});

export default router;
