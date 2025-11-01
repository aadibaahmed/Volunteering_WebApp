import React, { useState, useEffect } from 'react';
import './manager_dashboard.css';
import { dashboardApi } from '../../lib/managerApi.js';
import Header from '../../assets/header_after/header_after.jsx'

function ManagerDashboard() {
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
        totalEvents: data.stats?.totalEvents || 0,
        totalVolunteers: data.stats?.totalVolunteers || 0,
        activeMatches: data.stats?.activeMatches || 0,
        pendingAssignments: data.stats?.pendingAssignments || 0,
        recentEvents: Array.isArray(data.events) ? data.events.slice(-5) : [],
        recentMatches: Array.isArray(data.matches) ? data.matches.slice(-5) : [],
        notifications: Array.isArray(data.notifications) ? data.notifications.slice(-5) : []
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
      setDashboardData({
        totalEvents: 0,
        totalVolunteers: 0,
        activeMatches: 0,
        pendingAssignments: 0,
        recentEvents: [],
        recentMatches: [],
        notifications: []
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="manager-dashboard">
        <Header/>
        <div style={{ marginTop: '100px' }}>
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-dashboard">
        <Header/>
        <div style={{ marginTop: '100px' }}>
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="manager-dashboard">
      <Header/>
      <div style={{ marginTop: '100px' }}>
        <div className="dashboard-header">
          <h1>Manager Dashboard</h1>
          <div className="dashboard-actions">
            <button onClick={fetchDashboardData} className="refresh-btn">
              Refresh Data
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <OverviewTab data={dashboardData} />
        </div>
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

export default ManagerDashboard;
