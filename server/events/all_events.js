import { pool } from "../database.js";

export async function getAllEvents() {
  console.log("called all events")
  const result = await pool.query(`
    SELECT event_id, name, required_skills, location, volunteer_needed,
           time_start, time_end, event_date
    FROM events
  `);

  return result.rows.map((row) => ({
    id: row.event_id,
    name: row.name,
    requirements: row.required_skills,
    location: row.location,
    volunteers: row.volunteer_needed,
    start: row.time_start,
    end: row.time_end,
    date: row.event_date
  }));
}