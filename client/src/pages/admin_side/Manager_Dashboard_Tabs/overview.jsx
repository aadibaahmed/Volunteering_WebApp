import React, { useState, useEffect } from 'react';
import { dashboardApi} from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css'

function OverviewTab() {
  const [dashboardData, setDashboardData] = useState({
    totalEvents: 0,
    totalVolunteers: 0,
    activeMatches: 0,
    pendingAssignments: 0,
    recentEvents: [],
    recentMatches: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getManagerDashboardData();
      setDashboardData({
        totalEvents: data.stats?.totalEvents || 0,
        totalVolunteers: data.stats?.totalVolunteers || 0,
        activeMatches: data.stats?.activeMatches || 0,
        pendingAssignments: data.stats?.pendingAssignments || 0,
        recentEvents: Array.isArray(data.events) ? data.events.slice(-5) : [],
        recentMatches: Array.isArray(data.matches) ? data.matches.slice(-5) : [],
      });
    } catch (err) {
      console.error(err);
      setDashboardData({
        totalEvents: 0,
        totalVolunteers: 0,
        activeMatches: 0,
        pendingAssignments: 0,
        recentEvents: [],
        recentMatches: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
          <div>Loading Overview...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
        <div className="overview-tab">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Events</h3>
              <div className="stat-number">{dashboardData.totalEvents}</div>
            </div>
            <div className="stat-card">
              <h3>Total Volunteers</h3>
              <div className="stat-number">{dashboardData.totalVolunteers}</div>
            </div>
            <div className="stat-card">
              <h3>Active Matches</h3>
              <div className="stat-number">{dashboardData.activeMatches}</div>
            </div>
            <div className="stat-card">
              <h3>Pending Assignments</h3>
              <div className="stat-number">{dashboardData.pendingAssignments}</div>
            </div>
          </div>

          <div className="overview-sections">
            <div className="section">
              <h3>Recent Events</h3>
              {dashboardData.recentEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div>{event.eventName}</div>
                  <div>{event.date}</div>
                  <div>{event.location}</div>
                </div>
              ))}
            </div>

            <div className="section">
              <h3>Recent Matches</h3>
              {dashboardData.recentMatches.map(match => (
                <div key={match.id} className="match-item">
                  <div>{match.volunteer?.name || 'Unknown Volunteer'}</div>
                  <div>{match.event?.name || 'Unknown Event'}</div>
                  <div>{match.matchScore}%</div>
                  <div className={`match-status ${match.status}`}>{match.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
