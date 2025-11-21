import { pool } from "../database.js";

export async function getAllEvents() {
  console.log("called all events")
  const result = await pool.query(`
    SELECT 
      event_id AS id,
      name AS "eventName",
      required_skills AS skills,
      location,
      volunteer_needed AS volunteers,
      time_start AS "startTime",
      time_end AS "endTime",
      event_date AS date
    FROM events

    WHERE event_date >= CURRENT_DATE

  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.eventName,
    requirements: row.skills,
    location: row.location,
    volunteers: row.volunteers,
    start: row.startTime,
    end: row.endTime,
    date: row.date
  }));  
}