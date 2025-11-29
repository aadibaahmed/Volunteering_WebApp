import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../assets/header_after/header_after';
import './events.css';
import { api } from '../../lib/api';

function Events() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const getEvents = async () => {
      try {
        const res = await api.get('/events');
        const filtered = res.data.filter(event => event.manager_email && event.manager_email.trim() !== "");
        setEvents(filtered);

      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events.");
      }
    };
    getEvents();
  }, []);

  const handleDetails = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const renderTable = (title, items) => (
    <div className="status-section">
      {items.length === 0 ? (
        <p>No {title.toLowerCase()} found.</p>
      ) : (
        <div className="table-container">
          <h2 className="table-title">{title}</h2>
          <table className="events-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Requirements</th>
                <th>Location</th>
                <th>Volunteers</th>
                <th>Start</th>
                <th>End</th>
                <th>Date</th>
                <th>Contact</th>
                <th>Action</th>
                
              </tr>
            </thead>
            <tbody>
              {items.map((event, index) => (
                <tr key={index}>
                  <td>{event.eventName}</td>
                  <td>{event.skills}</td>
                  <td>{event.location}</td>
                  <td>{event.volunteers}</td>
                  <td>{event.startTime}</td>
                  <td>{event.endTime}</td>
                  <td>{new Date(event.date).toLocaleDateString()}</td>
                  <td>{event.manager_email || 'N/A'}</td>
                  <td>
                    <button
                      className="view_button"
                      onClick={() => handleDetails(event.id)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="events-dashboard-page">
      <div className="events-container">
        <Header />
        <div className="events-header">
          <h1 className="events-title" style={{ paddingLeft: '6rem' }}>
            Please sign up for events
          </h1>
          <p style={{ fontSize: '24px', color: '#555', marginTop: '2rem' }}>
            Explore volunteer opportunities and upcoming events below.
          </p>
        </div>

        {error ? <p>{error}</p> : renderTable("Upcoming Events", events)}
      </div>
    </div>
  );
}

export default Events;
