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
      volunteer_needed = 0,
      manager_user_id = null,
    } = req.body;

    console.log("Received data:", req.body);

    // `required_skills` is a free-text column in the new schema

    console.log("Urgency:", urgency);

    const result = await query(
      `INSERT INTO events (name, location, volunteer_needed, time_start, time_end, event_date, manager_user_id, urgency, event_description, required_skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        event_name,
        location,
        volunteer_needed,
        start_time,
        end_time,
        event_date,
        manager_user_id,
        urgency,
        event_description,
        required_skills,
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