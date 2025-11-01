import express from "express";
import { query } from "../database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


//create new event
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log("Received new event data:", req.body);
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
      manager_user_id = null,
    } = req.body;

    console.log("Received data:", req.body);
    // Validate required fields before DB call
    if (!event_name || !location || !event_date || !start_time || !end_time) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const manager_id = req.user?.id || null;
    const skillsArray = Array.isArray(required_skills)
      ? required_skills
      : required_skills.split(',').map(skill => skill.trim());

    const formattedSkills = skillsArray.join(', ');

    // `required_skills` is a free-text column in the new schema

    console.log("Urgency:", urgency);
    const urgencyValue = urgency.toLowerCase();

    const result = await query(
      `INSERT INTO events (name, required_skills, event_description, location, urgency, event_date, time_start, time_end, volunteer_needed, manager_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        manager_id
      ]
    );
    
    

    console.log("Full result:", result);
    console.log("Event created successfully:", result.rows[0]);

    res.status(201).json({
      message: "Event created successfully!",
      event: result.rows[0]
    });
    
    
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ 
      message: "Error creating event",
      error: err.message
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        event_id as "id",
        name as "eventName",           
        event_description as "description",
        location,
        required_skills as "skills",
        urgency,
        event_date as "date",
        time_start as "startTime",     
        time_end as "endTime",
        volunteer_needed as "volunteerNeeded"
      FROM events 
      ORDER BY event_date ASC
    `); 
    
    console.log("Events fetched:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// Update event
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
      volunteer_needed = 0,
    } = req.body;

    // Validate required fields
    if (!event_name || !location || !event_date || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Format skills
    const skillsArray = Array.isArray(required_skills)
      ? required_skills
      : typeof required_skills === 'string' 
        ? required_skills.split(',').map(skill => skill.trim())
        : [];
    
    const formattedSkills = skillsArray.join(', ');

    // Format urgency
    const urgencyValue = urgency ? urgency.toLowerCase() : 'low';

    const result = await query(
      `UPDATE events 
       SET name = $1, 
           required_skills = $2, 
           event_description = $3, 
           location = $4, 
           urgency = $5, 
           event_date = $6, 
           time_start = $7, 
           time_end = $8, 
           volunteer_needed = $9
       WHERE event_id = $10
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
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({
      message: "Event updated successfully!",
      event: result.rows[0]
    });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ 
      message: "Error updating event",
      error: err.message
    });
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

    res.status(200).json({
      message: "Volunteers updated successfully",
      event: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating volunteers:", err);
    res.status(500).json({ error: "Failed to update volunteers" });
  }
});


router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM events WHERE event_id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;