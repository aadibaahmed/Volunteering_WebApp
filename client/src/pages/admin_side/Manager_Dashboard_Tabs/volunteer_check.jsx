import React, { useState, useEffect } from 'react';
import { volunteerApi }from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css'

function VolunteersTab() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      const data = await volunteerApi.getAllVolunteers();
      // Ensure data is always an array
      setVolunteers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setVolunteers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
          <div>Loading Volunteers...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
        <div className="volunteers-tab">
          <h3>Volunteer Management</h3>
          <div className="volunteers-list">
            {volunteers.map(volunteer => (
              <div key={volunteer.volunteerId} className="volunteer-card">
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
      </div>
    </div>
  );
}

export default VolunteersTab;
