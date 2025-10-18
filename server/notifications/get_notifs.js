// export let notifications = [
//   { 
//     id: 1, 
//     userId: 1,
//     message: "You've been matched with a community clean-up event", 
//     time: "5 minutes ago", 
//     unread: true,
//     type: 'assignment',
//     eventId: 1,
//     priority: 'high'
//   },
//   { 
//     id: 2, 
//     userId: 1,
//     message: "Your volunteering hours have been approved", 
//     time: "2 hours ago", 
//     unread: false,
//     type: 'approval',
//     eventId: 2,
//     priority: 'medium'
//   },
//   {
//     id: 3,
//     userId: 2,
//     message: "New event available: Food Bank Distribution",
//     time: "1 hour ago",
//     unread: true,
//     type: 'event_available',
//     eventId: 2,
//     priority: 'medium'
//   },
//   {
//     id: 4,
//     userId: 1,
//     message: "Event reminder: Community Health Fair starts tomorrow",
//     time: "3 hours ago",
//     unread: true,
//     type: 'reminder',
//     eventId: 1,
//     priority: 'high'
//   }
// ];

// export function validateNotification(data) {
//   const errors = [];

//   if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0)
//     errors.push('Invalid message: required non-empty string');
//   else if (data.message.length > 255)
//     errors.push('Message too long (max 255 characters)');

//   if (!data.time || typeof data.time !== 'string' || data.time.trim().length === 0)
//     errors.push('Invalid time: required non-empty string');
//   else if (data.time.length > 50)
//     errors.push('Time too long (max 50 characters)');

//   if (typeof data.unread !== 'boolean')
//     errors.push('Invalid unread: must be a boolean');

//   if (data.userId && (typeof data.userId !== 'number' || data.userId <= 0))
//     errors.push('Invalid userId: must be a positive number');

//   if (data.type && !['assignment', 'approval', 'event_available', 'reminder', 'update'].includes(data.type))
//     errors.push('Invalid type: must be one of assignment, approval, event_available, reminder, update');

//   if (data.priority && !['low', 'medium', 'high'].includes(data.priority))
//     errors.push('Invalid priority: must be one of low, medium, high');

//   return errors;
// }

// export function getNotifications() {
//   return notifications;
// }

// export function getNotificationsForUser(userId) {
//   return notifications.filter(notification => notification.userId === userId);
// }

// export function getUnreadNotificationsForUser(userId) {
//   return notifications.filter(notification => 
//     notification.userId === userId && notification.unread
//   );
// }

// export function createNotification(userId, message, type = 'update', eventId = null, priority = 'medium') {
//   const newNotification = {
//     id: notifications.length + 1,
//     userId,
//     message,
//     time: 'Just now',
//     unread: true,
//     type,
//     eventId,
//     priority
//   };

//   // Validate the notification
//   const errors = validateNotification(newNotification);
//   if (errors.length > 0) {
//     throw new Error('Invalid notification: ' + errors.join(', '));
//   }

//   notifications.push(newNotification);
//   return newNotification;
// }

// export function markNotificationAsRead(notificationId) {
//   const notification = notifications.find(n => n.id === notificationId);
//   if (notification) {
//     notification.unread = false;
//     return notification;
//   }
//   return null;
// }

// export function markAllNotificationsAsRead(userId) {
//   const userNotifications = notifications.filter(n => n.userId === userId);
//   userNotifications.forEach(notification => {
//     notification.unread = false;
//   });
//   return userNotifications.length;
// }

// export function deleteNotification(notificationId) {
//   const index = notifications.findIndex(n => n.id === notificationId);
//   if (index !== -1) {
//     return notifications.splice(index, 1)[0];
//   }
//   return null;
// }

// export function getNotificationStats(userId) {
//   const userNotifications = getNotificationsForUser(userId);
//   const unreadCount = userNotifications.filter(n => n.unread).length;
//   const totalCount = userNotifications.length;
  
//   const priorityCounts = {
//     high: userNotifications.filter(n => n.priority === 'high').length,
//     medium: userNotifications.filter(n => n.priority === 'medium').length,
//     low: userNotifications.filter(n => n.priority === 'low').length
//   };

//   return {
//     total: totalCount,
//     unread: unreadCount,
//     priorityCounts
//   };
// }


export let notifications = [
  { id: 1, message: "You’ve been matched with a community clean-up event", time: "5 minutes ago", unread: true },
  { id: 2, message: "Your volunteering hours have been approved", time: "2 hours ago", unread: false },
];

export function validateNotification(data) {
  const errors = [];

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0)
    errors.push('Invalid message: required non-empty string');
  else if (data.message.length > 255)
    errors.push('Message too long (max 255 characters)');

  if (!data.time || typeof data.time !== 'string' || data.time.trim().length === 0)
    errors.push('Invalid time: required non-empty string');
  else if (data.time.length > 50)
    errors.push('Time too long (max 50 characters)');

  if (typeof data.unread !== 'boolean')
    errors.push('Invalid unread: must be a boolean');

  return errors;
}

export function getNotifications() {
  return notifications;
}