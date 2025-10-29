import React, { useState, useEffect } from 'react';
import { eventApi } from '../../../lib/managerApi';
import '../manager_dashboard.css'

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventApi.getAllEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading Events...</div>;

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

export default EventsTab;
