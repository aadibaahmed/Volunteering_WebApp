// notifications/get_notifs.js

// In-memory notification data
export let notifications = [
  {
    id: 1,
    user_id: 1,
    message: "You’ve been matched with a community clean-up event",
    time: "5 minutes ago",
    unread: true,
    type: 'assignment',
    priority: 'high'
  },
  {
    id: 2,
    user_id: 1,
    message: "Your volunteering hours have been approved",
    time: "2 hours ago",
    unread: false,
    type: 'approval',
    priority: 'medium'
  },
  {
    id: 3,
    user_id: 2,
    message: "New event available: Food Bank Distribution",
    time: "1 hour ago",
    unread: true,
    type: 'event_available',
    priority: 'medium'
  }
];

// Validation for new or updated notifications
export function validateNotification(data) {
  const errors = [];

  if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
    errors.push('Invalid message: required non-empty string');
  } else if (data.message.length > 255) {
    errors.push('Message too long (max 255 characters)');
  }

  if (!data.time || typeof data.time !== 'string' || !data.time.trim()) {
    errors.push('Invalid time: required non-empty string');
  } else if (data.time.length > 50) {
    errors.push('Time too long (max 50 characters)');
  }

  if (typeof data.unread !== 'boolean') {
    errors.push('Invalid unread: must be a boolean');
  }

  if (data.userId && (typeof data.userId !== 'number' || data.userId <= 0)) {
    errors.push('Invalid userId: must be a positive number');
  }

  return errors;
}

// Get all notifications (for admin)
export function getNotifications() {
  return notifications;
}

// Get notifications for a specific user
export function getNotificationsForUser(userId) {
  return notifications.filter(n => n.userId === userId);
}

// Get only unread notifications for a user
export function getUnreadNotificationsForUser(userId) {
  return notifications.filter(n => n.userId === userId && n.unread);
}

// Create a new notification
export function createNotification(userId, message, type = 'update', eventId = null, priority = 'medium') {
  const newNotification = {
    id: notifications.length + 1,
    userId,
    message,
    time: 'Just now',
    unread: true,
    type,
    eventId,
    priority
  };

  const errors = validateNotification(newNotification);
  if (errors.length > 0) {
    throw new Error('Invalid notification: ' + errors.join(', '));
  }

  notifications.push(newNotification);
  return newNotification;
}

// Mark one notification as read
export function markNotificationAsRead(notificationId) {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.unread = false;
    return notification;
  }
  return null;
}

// Mark all notifications as read for a user
export function markAllNotificationsAsRead(userId) {
  const userNotifications = notifications.filter(n => n.userId === userId);
  userNotifications.forEach(n => n.unread = false);
  return userNotifications.length;
}

// Delete a notification by ID
export function deleteNotification(notificationId) {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    return notifications.splice(index, 1)[0];
  }
  return null;
}

// Get stats summary for a user
export function getNotificationStats(userId) {
  const userNotifications = getNotificationsForUser(userId);
  const unreadCount = userNotifications.filter(n => n.unread).length;

  const priorityCounts = {
    high: userNotifications.filter(n => n.priority === 'high').length,
    medium: userNotifications.filter(n => n.priority === 'medium').length,
    low: userNotifications.filter(n => n.priority === 'low').length
  };

  return {
    total: userNotifications.length,
    unread: unreadCount,
    priorityCounts
  };
}
