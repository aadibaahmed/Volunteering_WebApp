import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  getNotificationsForUser,
  getUnreadNotificationsForUser,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats
} from '../notifications/get_notifs.js';

const router = express.Router();

// Get all notifications (Superuser only)
router.get('/notifications', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(getNotifications());
  } catch (error) {
    console.error('Error getting all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create a new notification (Superuser only)
router.post('/create', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId, message, type = 'update', eventId = null, priority = 'medium' } = req.body;

    if (!userId || !message?.trim()) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const newNotif = createNotification(userId, message, type, eventId, priority);
    res.status(201).json(newNotif);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get notifications for logged-in user
router.get('/my-notifications', requireAuth, (req, res) => {
  try {
    const notifications = getNotificationsForUser(req.user.sub);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
  }
});

// Get unread notifications for logged-in user
router.get('/unread', requireAuth, (req, res) => {
  try {
    const unread = getUnreadNotificationsForUser(req.user.sub);
    res.json(unread);
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Mark one notification as read
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

    const notif = markNotificationAsRead(id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', requireAuth, (req, res) => {
  try {
    const count = markAllNotificationsAsRead(req.user.sub);
    res.json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

    const notif = deleteNotification(id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification stats for user
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = getNotificationStats(req.user.sub);
    res.json(stats);
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
