import { useState, useEffect } from 'react';
import './Notifications.css';
import { api } from '../../../lib/api';

const Notifications = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setRole(user.role);
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        let endpoint = '';

        if (role === 'superuser') {
          endpoint = '/notifications';
        } else if (role === 'user') {
          endpoint = '/my-notifications';
        } else {
          console.warn('Unknown role. No notifications endpoint selected.');
          return;
        }

        const { data } = await api.get(endpoint);

        const formatted = data.map((n) => ({
          id: n.notif_id ?? n.id,
          user_id: n.user_id,
          message: n.message,
          time: new Date(n.time).toLocaleString(),
          unread: n.unread,
          type: n.type,
          priority: n.priority,
        }));

        setNotifications(formatted);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    if (role) fetchNotifications();
  }, [role]);

  const markAsRead = async (notif) => {
    console.log(notif)
    try {
      await api.put(`/${notif}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif ? { ...n, unread: false } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="notifications-container">
      <button
        className="notifications-bell"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>
              {role === 'superuser'
                ? 'Manager Notifications'
                : 'Your Notifications'}
            </h3>
          </div>

          {loading ? (
            <div className="loading">Loading notifications...</div>
          ) : notifications.length > 0 ? (
            <div className="notifications-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.unread ? 'unread' : 'read'}`}
                >
                  <div className="notification-content">
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-meta">
                      <span className="time">{n.time}</span>
                      {n.priority && (
                        <span
                          className={`priority ${n.priority.toLowerCase()}`}
                        >
                          {n.priority}
                        </span>
                      )}
                      {n.type && <span className="type">{n.type}</span>}
                    </div>
                  </div>

                  <div className="notification-actions">
                    {n.unread && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="mark-read-btn"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-notifications">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
