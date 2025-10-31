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
        event_id as id,
        name as "eventName",           
        event_description as description,   
        required_skills,
        urgency,
        event_date,
        time_start as "startTime",     
        time_end as "endTime"         
      FROM events 
      WHERE event_date >= CURRENT_DATE 
      ORDER BY event_date ASC
    `); 
    
    console.log("Events fetched:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Error fetching events" });
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