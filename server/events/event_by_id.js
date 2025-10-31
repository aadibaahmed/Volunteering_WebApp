import { pool } from "../database.js";

export async function event_by_id(req, res) {
  console.log("called event_by_id");

  try {
    const { id } = req.params;
    console.log("Fetching event id:", id);

    const result = await pool.query(
      `SELECT 
        event_id AS id,
        name AS "eventName",
        event_description AS description,
        required_skills AS skills,
        urgency,
        event_date AS date,
        time_start AS "startTime",
        time_end AS "endTime"
       FROM events
       WHERE event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching event details:", err);
    res.status(500).json({ message: "Error fetching event details" });
  }
}