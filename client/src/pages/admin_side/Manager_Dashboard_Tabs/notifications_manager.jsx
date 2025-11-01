import React, { useState, useEffect } from 'react';
import { notificationApi } from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css'

function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.getMyNotifications();
      // Normalize data
      const formatted = Array.isArray(data) ? data.map(n => ({
        id: n.notif_id ?? n.id,
        user_id: n.user_id,
        message: n.message,
        time: new Date(n.time).toLocaleString(),
        unread: n.unread,
        type: n.type,
        priority: n.priority,
      })) : [];
      setNotifications(formatted);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Call the API
      await notificationApi.markAsRead(id);
      // Update local state instead of refetching
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, unread: false } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
          <div>Loading Notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
        <div className="notifications-tab">
          <h3>Notifications</h3>
          <div className="notifications-list">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.unread ? 'unread' : 'read'}`}
              >
                <div className="notification-content">
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    <span className="time">{notification.time}</span>
                    <span className={`priority ${notification.priority}`}>{notification.priority}</span>
                    <span className="type">{notification.type}</span>
                  </div>
                </div>
                <div className="notification-actions">
                  {notification.unread && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="mark-read-btn"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsTab;
