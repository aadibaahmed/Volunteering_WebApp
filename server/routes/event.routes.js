import express from "express";
import { query } from "../database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      event_name,
      event_description,
      location,
      required_skills,
      urgency,
      event_date,
      start_time,
      end_time,
      volunteer_needed = 0,
    } = req.body;

    if (!event_name || !location || !event_date || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const manager_id = req.user?.sub || req.user?.id || null;
    const manager_email = req.user?.email || null;
    const skillsArray = Array.isArray(required_skills)
      ? required_skills
      : required_skills.split(',').map(skill => skill.trim());

    const formattedSkills = skillsArray.join(', ');
    const urgencyValue = urgency?.toLowerCase() || null;

    const result = await query(
      `INSERT INTO events 
      (name, required_skills, event_description, location, urgency, event_date, time_start, time_end, volunteer_needed, manager_user_id, manager_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        event_name,
        formattedSkills,
        event_description,
        location,
        urgencyValue,
        event_date,
        start_time,
        end_time,
        volunteer_needed,
        manager_id,
        manager_email
      ]
    );

    res.status(201).json({
      message: "Event created successfully!",
      event: result.rows[0]
    });

  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ message: "Error creating event" });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        event_id AS id,
        name AS "eventName",
        event_description AS description,
        location,
        required_skills AS skills,
        urgency,
        event_date AS date,
        time_start AS "startTime",
        time_end AS "endTime",
        volunteer_needed AS volunteers,
        manager_user_id,
        manager_email
      FROM events
      WHERE event_date >= CURRENT_DATE
      ORDER BY event_date ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET events error:", err.message);
    res.status(500).json({ message: "Error fetching events" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        event_id AS id,
        name AS "eventName",
        event_description AS description,
        location,
        required_skills AS skills,
        urgency,
        event_date AS date,
        time_start AS "startTime",
        time_end AS "endTime",
        volunteer_needed AS "volunteers",
        manager_user_id,
        manager_email
      FROM events
      WHERE event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load event" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      event_name,
      event_description,
      location,
      required_skills,
      urgency,
      event_date,
      start_time,
      end_time,
      volunteer_needed
    } = req.body;

    const skillsArray = Array.isArray(required_skills)
      ? required_skills
      : required_skills.split(',').map(s => s.trim());

    const result = await query(
      `UPDATE events
       SET 
        name = $1,
        event_description = $2,
        location = $3,
        required_skills = $4,
        urgency = $5,
        event_date = $6,
        time_start = $7,
        time_end = $8,
        volunteer_needed = $9
       WHERE event_id = $10
       RETURNING *`,
      [
        event_name,
        event_description,
        location,
        skillsArray.join(', '),
        urgency.toLowerCase(),
        event_date,
        start_time,
        end_time,
        volunteer_needed,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      message: "Event updated successfully",
      event: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update event" });
  }
});

router.put("/:id/volunteers", async (req, res) => {
  const { id } = req.params;
  const { volunteer_ids } = req.body;

  if (!Array.isArray(volunteer_ids)) {
    return res.status(400).json({ error: "volunteer_ids must be an array" });
  }

  try {
    const result = await query(
      `UPDATE events
       SET volunteer_ids = $1
       WHERE event_id = $2
       RETURNING *`,
      [volunteer_ids, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Volunteers updated successfully", event: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update volunteers" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM events WHERE event_id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
