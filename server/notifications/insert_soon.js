import { pool } from '../database.js'; 

export async function insert_on_soon(user_id, message, unread = true, type = "event", priority = "high") {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, message, unread, type, priority)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user_id, message, unread, type, priority]
  );
  return result.rows[0];
}