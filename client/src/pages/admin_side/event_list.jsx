import React, { useEffect, useState } from "react";
import axios from "axios";
import "./event_list.css";

function EventList() {
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null); // event being edited
  const [formData, setFormData] = useState({}); // temporary edit data

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/events");
        setEvents(res.data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await axios.delete(`http://localhost:3000/api/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Handle edit click
  const handleEditClick = (event) => {
    setEditingEvent(event.id);
    setFormData({ ...event }); // fill form with current values
  };

  // Handle form field change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle update submit
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(
        `http://localhost:3000/api/events/${editingEvent}`,
        formData
      );
      setEvents(
        events.map((e) => (e.id === editingEvent ? res.data.event : e))
      );
      setEditingEvent(null); // close edit mode
      alert("Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event.");
    }
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                {editingEvent === event.id ? (
                  <>
                    <td>
                      <input
                        name="eventName"
                        value={formData.eventName}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <select
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <button onClick={handleUpdate}>Save</button>
                      <button onClick={() => setEditingEvent(null)}>
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{event.eventName}</td>
                    <td>{event.description}</td>
                    <td>{event.location}</td>
                    <td>{event.skills.join(", ")}</td>
                    <td>{event.urgency}</td>
                    <td>{event.date}</td>
                    <td>{event.startTime}</td>
                    <td>{event.endTime}</td>
                    <td>
                      <button onClick={() => handleEditClick(event)}>Edit</button>
                      <button onClick={() => handleDelete(event.id)}>
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EventList;
