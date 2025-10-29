import React, { useState, useEffect } from 'react';
import { volunteerApi }from '../../../lib/managerApi';
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
      setVolunteers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading Volunteers...</div>;

  return (
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
  );
}

export default VolunteersTab;
