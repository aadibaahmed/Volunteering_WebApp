import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  getNotificationsForUser,
  // getUnreadNotificationsForUser,
  // createNotification,
  markNotificationAsRead,
  // markAllNotificationsAsRead,
  // deleteNotification,
  // getNotificationStats
} from '../notifications/get_notifs.js';

const router = express.Router();

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const notifications = await getNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error getting all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// router.post('/create', requireAuth, async (req, res) => {
//   try {
//     if (req.user.role !== 'superuser') {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     const { userId, message, type = 'update', priority = 'medium' } = req.body;

//     if (!userId || !message?.trim()) {
//       return res.status(400).json({ error: 'userId and message are required' });
//     }

//     const newNotif = await createNotification(userId, message, type, priority);
//     res.status(201).json(newNotif);
//   } catch (error) {
//     console.error('Error creating notification:', error);
//     res.status(500).json({ error: 'Failed to create notification' });
//   }
// });

router.get('/my-notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await getNotificationsForUser(req.user.sub);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
  }
});

// router.get('/unread', requireAuth, async (req, res) => {
//   try {
//     const unread = await getUnreadNotificationsForUser(req.user.sub);
//     res.json(unread);
//   } catch (error) {
//     console.error('Error getting unread notifications:', error);
//     res.status(500).json({ error: 'Failed to fetch unread notifications' });
//   }
// });

router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

    const notif = await markNotificationAsRead(id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.user_id !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// router.put('/mark-all-read', requireAuth, async (req, res) => {
//   try {
//     const count = await markAllNotificationsAsRead(req.user.sub);
//     res.json({ message: `Marked ${count} notifications as read` });
//   } catch (error) {
//     console.error('Error marking all notifications as read:', error);
//     res.status(500).json({ error: 'Failed to mark notifications as read' });
//   }
// });

// router.delete('/:id', requireAuth, async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);
//     if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

//     const notif = await deleteNotification(id);
//     if (!notif) return res.status(404).json({ error: 'Notification not found' });
//     if (notif.user_id !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

//     res.json({ message: 'Notification deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting notification:', error);
//     res.status(500).json({ error: 'Failed to delete notification' });
//   }
// });

// router.get('/stats', requireAuth, async (req, res) => {
//   try {
//     const stats = await getNotificationStats(req.user.sub);
//     res.json(stats);
//   } catch (error) {
//     console.error('Error getting notification stats:', error);
//     res.status(500).json({ error: 'Failed to fetch stats' });
//   }
// });

export default router;
