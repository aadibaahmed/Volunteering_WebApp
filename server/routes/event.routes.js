import express from "express";
import { query } from "../database.js";

const router = express.Router();


//create new event
router.post("/", async (req, res) => {
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
    } = req.body;

    console.log("Received data:", req.body);

    const skillsArray = required_skills.split(',').map(skill => skill.trim());
    const formattedSkills = `{${skillsArray.join(',')}}`;

    console.log("Formatted skills:", formattedSkills);
    console.log("Urgency:", urgency);

    const result = await query(
      `INSERT INTO events (name, requirements, location, skills, urgency, date, time_start, time_end, volunteer_needed, manager)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        event_name,
        event_description,
        location,
        formattedSkills,
        urgency,
        event_date,
        start_time,
        end_time,
        0,
        null
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
        requirements as description,   
        skills,
        urgency,
        date,
        time_start as "startTime",     
        time_end as "endTime"         
      FROM events 
      WHERE date >= CURRENT_DATE 
      ORDER BY date ASC
    `); 
    
    console.log("Events fetched:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Error fetching events" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM events WHERE event_id=$1", [id]);
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Error deleting event" });
  }
});

export default router;