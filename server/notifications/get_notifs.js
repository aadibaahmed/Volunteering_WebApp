import { pool } from '../database.js'; 

export async function getNotifications() {
  const result = await pool.query('SELECT * FROM notifications ORDER BY notif_id DESC');
  return result.rows;
}

export async function getNotificationsForUser(user_id) {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY time DESC',
    [user_id]
  );
  return result.rows;
}

export async function getUnreadNotificationsForUser(user_id) {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 AND unread = TRUE ORDER BY time DESC',
    [user_id]
  );
  return result.rows;
}

export async function createNotification(user_id, message, type = 'update', priority = 'medium') {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, message, time, unread, type, priority)
     VALUES ($1, $2, NOW(), TRUE, $3, $4)
     RETURNING *`,
    [user_id, message, type, priority]
  );
  return result.rows[0];
}

export async function markNotificationAsRead(notif_id) {
  const result = await pool.query(
    `UPDATE notifications
     SET unread = FALSE
     WHERE notif_id = $1
     RETURNING *`,
    [notif_id]
  );
  return result.rows[0];
}

export async function markAllNotificationsAsRead(user_id) {
  const result = await pool.query(
    `UPDATE notifications
     SET unread = FALSE
     WHERE user_id = $1
     RETURNING *`,
    [user_id]
  );
  return result.rowCount;
}

export async function deleteNotification(notif_id) {
  const result = await pool.query(
    `DELETE FROM notifications
     WHERE notif_id = $1
     RETURNING *`,
    [notif_id]
  );
  return result.rows[0];
}

export async function getNotificationStats(user_id) {
  const result = await pool.query(
    `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE unread = TRUE) AS unread,
        COUNT(*) FILTER (WHERE priority = 'high') AS high,
        COUNT(*) FILTER (WHERE priority = 'medium') AS medium,
        COUNT(*) FILTER (WHERE priority = 'low') AS low
     FROM notifications
     WHERE user_id = $1`,
    [user_id]
  );

  const stats = result.rows[0];
  return {
    total: Number(stats.total),
    unread: Number(stats.unread),
    priorityCounts: {
      high: Number(stats.high),
      medium: Number(stats.medium),
      low: Number(stats.low),
    },
  };
}
