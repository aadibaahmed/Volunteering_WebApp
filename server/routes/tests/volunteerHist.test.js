import express from "express";
import { pool } from "../database.js"; // your PostgreSQL connection pool

const router = express.Router();

// GET volunteer history (optionally filtered by volunteer_id)
router.get("/", async (req, res) => {
  const { volunteer_id } = req.query; // optional query param

  try {
    const query = `
      SELECT 
        h.history_id AS id,
        h.participation_date AS start,
        h.participation_date AS end,
        h.task_description AS role,
        e.name AS organization
      FROM volunteer_history h
      JOIN events e ON h.event_id = e.event_id
      ${volunteer_id ? "WHERE h.volunteer_id = $1" : ""}
      ORDER BY h.participation_date DESC;
    `;

    const params = volunteer_id ? [volunteer_id] : [];
    const result = await pool.query(query, params);

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