import { pool } from "../database.js";

export async function getAllEvents() {
  const result = await pool.query(`
    SELECT name, requirements, location, volunteer_needed,
           time_start, time_end, date
    FROM events
  `);

  return result.rows.map((row) => ({
    name: row.name,
    requirements: row.requirements,
    location: row.location,
    volunteers: row.volunteer_needed,
    start: row.time_start,
    end: row.time_end,
    date: row.date,
  }));
}