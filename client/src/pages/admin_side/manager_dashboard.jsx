import React, { useState, useEffect } from 'react';
import './manager_dashboard.css';
import { dashboardApi, eventApi, matchingApi, notificationApi, volunteerApi } from '../../lib/managerApi.js';
import EventList from '../admin_side/event_list.jsx';
import Header from '../../assets/header_after/header_after.jsx'

function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    totalEvents: 0,
    totalVolunteers: 0,
    activeMatches: 0,
    pendingAssignments: 0,
    recentEvents: [],
    recentMatches: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getManagerDashboardData();
      
      setDashboardData({
        totalEvents: data.stats.totalEvents,
        totalVolunteers: data.stats.totalVolunteers,
        activeMatches: data.stats.activeMatches,
        pendingAssignments: data.stats.pendingAssignments,
        recentEvents: data.events.slice(-5),
        recentMatches: data.matches.slice(-5),
        notifications: data.notifications.slice(-5)
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="manager-dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-dashboard">
        <div className="error">{error}</div>
      </div>
    );
  }
  return (
    <div className="manager-dashboard">
      <Header/>
      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <div className="dashboard-actions">
          <button onClick={fetchDashboardData} className="refresh-btn">
            Refresh Data
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'events' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('events')}
        >
          Events
        </button>
        <button
          className={activeTab === 'volunteers' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('volunteers')}
        >
          Volunteers
        </button>
        <button
          className={activeTab === 'matching' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('matching')}
        >
          Matching
        </button>
        <button
          className={activeTab === 'notifications' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('notifications')}
        >
          Notifications
        </button>
        
        <button
          className={activeTab === 'allEvents' ? 'tab active' : 'tab'}
          onClick={() => handleTabChange('allEvents')}
        >
          All Events
        </button>

      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'volunteers' && <VolunteersTab />}
        {activeTab === 'matching' && <MatchingTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'allEvents' && <EventList />}

      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }) {
  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Events</h3>
          <div className="stat-number">{data.totalEvents}</div>
        </div>
        <div className="stat-card">
          <h3>Total Volunteers</h3>
          <div className="stat-number">{data.totalVolunteers}</div>
        </div>
        <div className="stat-card">
          <h3>Active Matches</h3>
          <div className="stat-number">{data.activeMatches}</div>
        </div>
        <div className="stat-card">
          <h3>Pending Assignments</h3>
          <div className="stat-number">{data.pendingAssignments}</div>
        </div>
      </div>

      <div className="overview-sections">
        <div className="section">
          <h3>Recent Events</h3>
          <div className="event-list">
            {data.recentEvents.map(event => (
              <div key={event.id} className="event-item">
                <div className="event-name">{event.eventName}</div>
                <div className="event-date">{event.date}</div>
                <div className="event-location">{event.location}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Recent Matches</h3>
          <div className="match-list">
            {data.recentMatches.map(match => (
              <div key={match.id} className="match-item">
                <div className="match-volunteer">
                  {match.volunteer?.name || 'Unknown Volunteer'}
                </div>
                <div className="match-event">
                  {match.event?.name || 'Unknown Event'}
                </div>
                <div className="match-score">{match.matchScore}%</div>
                <div className={`match-status ${match.status}`}>{match.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const events = await eventApi.getAllEvents();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="events-tab">
      <div className="events-header">
        <h3>Event Management</h3>
        <button className="create-event-btn" onClick={() => window.location.href = '/eventmanagement'}>
          Create New Event
        </button>
      </div>
      
      <div className="events-list">
        {events.map(event => (
          <div key={event.id} className="event-card">
            <div className="event-header">
              <h4>{event.eventName}</h4>
              <span className={`urgency ${event.urgency.toLowerCase()}`}>
                {event.urgency}
              </span>
            </div>
            <div className="event-details">
              <p><strong>Date:</strong> {event.date}</p>
              <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
              <p><strong>Location:</strong> {event.location}</p>
              <p><strong>Skills Required:</strong> {Array.isArray(event.skills) ? event.skills.join(', ') : event.skills}</p>
            </div>
            <div className="event-actions">
              <button className="edit-btn">Edit</button>
              <button className="delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Volunteers Tab Component
function VolunteersTab() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const volunteers = await volunteerApi.getAllVolunteers();
      setVolunteers(volunteers);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading volunteers...</div>;
  }

  return (
    <div className="volunteers-tab">
      <h3>Volunteer Management</h3>
      <div className="volunteers-list">
        {volunteers.map((volunteer, index) => (
          <div key={volunteer.volunteerId || index} className="volunteer-card">
            <div className="volunteer-info">
              <h4>{volunteer.volunteerName}</h4>
              <p>{volunteer.email}</p>
            </div>
            <div className="volunteer-stats">
              <div className="stat">
                <span className="label">Total Events:</span>
                <span className="value">{volunteer.totalEvents}</span>
              </div>
              <div className="stat">
                <span className="label">Completed:</span>
                <span className="value">{volunteer.completedEvents}</span>
              </div>
              <div className="stat">
                <span className="label">Total Hours:</span>
                <span className="value">{volunteer.totalHours}</span>
              </div>
              <div className="stat">
                <span className="label">Last Activity:</span>
                <span className="value">{volunteer.lastActivity}</span>
              </div>
            </div>
            <div className="volunteer-actions">
              <button className="view-history-btn">View History</button>
              <button className="contact-btn">Contact</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Matching Tab Component
function MatchingTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const matches = await matchingApi.getAllMatches();
      setMatches(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (matchId, newStatus) => {
    try {
      await matchingApi.updateMatchStatus(matchId, newStatus);
      fetchMatches(); // Refresh the list
    } catch (error) {
      console.error('Error updating match status:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  return (
    <div className="matching-tab">
      <h3>Volunteer Matching</h3>
      <div className="matches-list">
        {matches.map(match => (
          <div key={match.id} className="match-card">
            <div className="match-info">
              <div className="volunteer-info">
                <h4>{match.volunteer?.name || 'Unknown Volunteer'}</h4>
                <p>Skills: {match.volunteer?.skills?.join(', ') || 'N/A'}</p>
              </div>
              <div className="event-info">
                <h4>{match.event?.name || 'Unknown Event'}</h4>
                <p>Date: {match.event?.date || 'N/A'}</p>
                <p>Location: {match.event?.location || 'N/A'}</p>
              </div>
            </div>
            <div className="match-details">
              <div className="match-score">
                <span className="label">Match Score:</span>
                <span className="value">{match.matchScore}%</span>
              </div>
              <div className="match-status">
                <span className="label">Status:</span>
                <span className={`status ${match.status}`}>{match.status}</span>
              </div>
              <div className="match-notes">
                <span className="label">Notes:</span>
                <span className="value">{match.notes || 'No notes'}</span>
              </div>
            </div>
            <div className="match-actions">
              <select 
                value={match.status} 
                onChange={(e) => handleStatusUpdate(match.id, e.target.value)}
                className="status-select"
              >
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notifications = await notificationApi.getMyNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      fetchNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading notifications...</div>;
  }

  return (
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
                <span className={`priority ${notification.priority}`}>
                  {notification.priority}
                </span>
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
  );
}

export default ManagerDashboard;
