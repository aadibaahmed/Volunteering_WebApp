import React, { useState } from 'react';
import './Notifications.css';

const Notifications = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Sample placeholder volunteering notifications
  const notifications = [
    { id: 1, message: "You’ve been matched with a community clean-up event", time: "5 minutes ago", unread: true },
    { id: 2, message: "Your volunteering hours have been approved", time: "2 hours ago", unread: false },
  ];

  return (
    <div className="notifications-container">
      <button 
        className="notifications-bell"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {notifications.some(n => n.unread) && (
          <span className="notification-badge">
            {notifications.filter(n => n.unread).length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
          </div>

          <div className="notifications-list">
            {notifications.map((n) => (
              <div 
                key={n.id}
                className={`notification-item ${n.unread ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">{n.time}</div>
                </div>
                {n.unread && <div className="unread-dot"></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
