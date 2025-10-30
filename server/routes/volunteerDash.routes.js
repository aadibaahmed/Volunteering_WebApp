import express from "express";
import { pool } from "../database.js"; // Your PostgreSQL connection pool
import { requireAuth } from "../middleware/auth.js"; // Authentication middleware

const router = express.Router();

/**
 * @route GET /volunteer-dashboard
 * @desc Get all dashboard statistics for the currently authenticated volunteer.
 * Requires a valid JWT (checked by requireAuth).
 * @access Private
 */
router.get("/volunteer-dashboard", requireAuth, async (req, res) => {
    // The volunteer's ID is expected to be in the 'sub' field of the decoded JWT payload.
    const volunteerId = req.user.sub; 

    try {
        // --- 1. Get Volunteer Profile Data (First Name and Last Name) ---
        // Uses 'id' from the volunteers table which should match req.user.sub
        const userQuery = await pool.query(
            'SELECT first_name, last_name FROM volunteers WHERE id = $1',
            [volunteerId]
        );
        const user = userQuery.rows[0];

        if (!user) {
            return res.status(404).json({ msg: 'Volunteer profile not found for this user.' });
        }

        // --- 2. Fetch All Dashboard Metrics in Parallel using Promise.all ---
        const [
            hoursResult,
            completedEventsResult,
            allFutureEventsResult,
            pendingSignupsResult
        ] = await Promise.all([
            // A. Total Hours Volunteered: Sums all logged hours.
            pool.query(
                'SELECT COALESCE(SUM(hours_served), 0) AS "totalHours" FROM volunteer_history WHERE volunteer_id = $1',
                [volunteerId]
            ),

            // B. Events Volunteered (Maps to totalVolunteers in React state): Counts unique completed events.
            pool.query(
                'SELECT COUNT(DISTINCT event_id) AS "eventsVolunteered" FROM volunteer_history WHERE volunteer_id = $1',
                [volunteerId]
            ),

            // C. Total Upcoming/Active Events (Active Opportunities and totalEvents): Counts all future events.
            pool.query(
                'SELECT COUNT(*) AS "activeOpportunities" FROM events WHERE date >= CURRENT_DATE'
            ),

            // D. Pending Sign-ups: Uses the new Volunteer_Signups table where status is 'SignedUp'.
            pool.query(
                'SELECT COUNT(*) AS "pendingApprovals" FROM Volunteer_Signups WHERE volunteer_id = $1 AND signup_status = $2',
                [volunteerId, 'SignedUp']
            ),
        ]);

        // --- 3. Compile and Send Response ---
        const dashboardData = {
            firstName: user.first_name,
            lastName: user.last_name,
            // Convert to number; use parseFloat for hours
            totalHours: parseFloat(hoursResult.rows[0].totalHours),
            // Convert to integer
            totalVolunteers: parseInt(completedEventsResult.rows[0].eventsVolunteered, 10), 
            // totalEvents and activeOpportunities are the same metric (total number of opportunities)
            totalEvents: parseInt(allFutureEventsResult.rows[0].activeOpportunities, 10), 
            activeOpportunities: parseInt(allFutureEventsResult.rows[0].activeOpportunities, 10),
            pendingApprovals: parseInt(pendingSignupsResult.rows[0].pendingApprovals, 10),
        };

        res.json(dashboardData);

    } catch (err) {
        console.error('Dashboard Route Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch volunteer dashboard data.' });
    }
});

export default router;