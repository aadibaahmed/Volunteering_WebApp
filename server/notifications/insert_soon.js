import { pool } from '../database.js'; 


export async function insert_on_soon(user_id, event_id, message, unread = true, type = "event", priority = "high") {
  
  const check = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
       AND event_id = $2
       AND type = 'event'
     LIMIT 1`,
    [user_id, event_id]
  );

  if (check.rows.length > 0) {
    return check.rows[0];
  }
  const result = await pool.query(
    `INSERT INTO notifications (user_id, event_id, message, unread, type, priority)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user_id, event_id, message, unread, type, priority]
  );

  return result.rows[0];
}
