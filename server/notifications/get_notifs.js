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
