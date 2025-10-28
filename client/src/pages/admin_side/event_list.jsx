import React, { useEffect, useState } from "react";
import axios from "axios";
import "./event_list.css";

function EventList() {
  const [events, setEvents] = useState([]);

  //get all events from the backend
  useEffect(() => {
    axios
      .get("http://localhost:3000/api/events")
      .then((res) => {
        console.log("Fetched events:", res.data);
        setEvents(res.data);
      })
      .catch((err) => console.error("Error fetching events:", err));
  }, []);
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    return dateString.split('T')[0];
  };

  return (
    <div className="event-list-wrapper">
      <h1>All Events</h1>

      {events.length === 0 ? (
        <p>No events available yet.</p>
      ) : (
        <table className="event-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Description</th>
              <th>Location</th>
              <th>Skills</th>
              <th>Urgency</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.eventName || event.name || 'N/A'}</td>
                <td>{event.description || event.requirements || 'N/A'}</td>
                <td>{event.location || 'N/A'}</td>
                <td>{Array.isArray(event.skills) ? event.skills.join(", ") : event.skills || 'N/A'}</td>
                <td>{event.urgency || 'N/A'}</td>
                <td>{formatDate(event.date)}</td>
                <td>{event.startTime || event.time_start || 'N/A'}</td>
                <td>{event.endTime || event.time_end || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EventList;