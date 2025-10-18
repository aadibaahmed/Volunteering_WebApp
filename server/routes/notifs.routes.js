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

// Get all notifications (for managers)
router.get('/notifications', requireAuth, (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const notifications = getNotifications();
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get notifications for authenticated user
router.get('/my-notifications', requireAuth, (req, res) => {
  try {
    const { sub: userId } = req.user;
    const notifications = getNotificationsForUser(userId);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get unread notifications for authenticated user
router.get('/unread', requireAuth, (req, res) => {
  try {
    const { sub: userId } = req.user;
    const notifications = getUnreadNotificationsForUser(userId);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    res.status(500).json({ error: 'Failed to get unread notifications' });
  }
});

// Create notification (managers only)
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { userId, message, type, eventId, priority } = req.body;
    
    // Validation
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    
    if (typeof userId !== 'number' || userId <= 0) {
      return res.status(400).json({ error: 'userId must be a positive number' });
    }
    
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message must be a non-empty string' });
    }
    
    if (message.length > 255) {
      return res.status(400).json({ error: 'message too long (max 255 characters)' });
    }
    
    const notification = createNotification(
      userId,
      message,
      type || 'update',
      eventId || null,
      priority || 'medium'
    );
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message || 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { sub: userId } = req.user;
    
    const notificationIdNum = parseInt(notificationId);
    if (isNaN(notificationIdNum)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const notification = markNotificationAsRead(notificationIdNum);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Check if user owns this notification
    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read for user
router.put('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const { sub: userId } = req.user;
    const count = markAllNotificationsAsRead(userId);
    res.json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:notificationId', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { sub: userId } = req.user;
    
    const notificationIdNum = parseInt(notificationId);
    if (isNaN(notificationIdNum)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const notification = deleteNotification(notificationIdNum);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Check if user owns this notification
    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification statistics for user
router.get('/stats', requireAuth, (req, res) => {
  try {
    const { sub: userId } = req.user;
    const stats = getNotificationStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
});

export default router;
