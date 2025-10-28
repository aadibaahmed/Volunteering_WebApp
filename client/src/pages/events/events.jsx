import React, { useState, useEffect } from 'react';
import Header from '../../assets/header_after/header_after';
import './events.css';
import { api } from '../../lib/api';

function Events() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const getEvents = async () => {
      try {
        const res = await api.get('/allevents');
        setEvents(res.data);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events.");
      }
    };
    getEvents();
  }, []);

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
              </tr>
            </thead>
            <tbody>
              {items.map((event, index) => (
                <tr key={index}>
                  <td>{event.name}</td>
                  <td>{event.requirements}</td>
                  <td>{event.location}</td>
                  <td>{event.volunteers}</td>
                  <td>{new Date(event.start).toLocaleString()}</td>
                  <td>{new Date(event.end).toLocaleString()}</td>
                  <td>{new Date(event.date).toLocaleDateString()}</td>
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
          <h1 className="events-title">
            THIS IS WHERE ALL THE EVENTS WILL BE LISTED
          </h1>
        </div>

        {error ? (
          <p>{error}</p>
        ) : (
          renderTable("Upcoming Events", events)
        )}
      </div>
    </div>
  );
}

export default Events;
