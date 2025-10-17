import React, { useState } from "react";
import "./event_management.css";
import axios from "axios";

function EventManagement() {
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState([]);
  const [urgency, setUrgency] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const allSkills = ["First Aid","CPR","Teaching","Event Setup","Food Service","Crowd Control","Logistics", "Cooking", "Cleaning", "Organizing"];

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!eventName || !eventDescription || !location || !skills.length || !urgency || !eventDate) {
      alert("Please fill out all required fields.");
      return;
    }
  
    const newEvent = {
      eventName,
      description: eventDescription,
      location,
      skills,
      urgency,
      date: eventDate,
      startTime,
      endTime,
    };
    
  
    try {
      const res = await axios.post("http://localhost:3000/api/events/create", newEvent);
      setSuccessMsg(res.data.message);
      console.log("Event created:", res.data.event);
  
      // reset form
      setEventName("");
      setEventDescription("");
      setLocation("");
      setSkills([]);
      setUrgency("");
      setEventDate("");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
    }
  };
  

  const handleSkillChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (option) => option.value);
    setSkills(options);
  };

  return (
    <div className="event-wrapper">
      <form className="event-card" onSubmit={handleSubmit}>
        <h1>Create Event</h1>

        {successMsg && <div className="notice ok">{successMsg}</div>}

        <label>Event Name</label>
        <input
          type="text"
          maxLength={100}
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          required
        />

        <label>Event Description</label>
        <textarea
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          required
        ></textarea>

        <label>Location</label>
        <textarea
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        ></textarea>

        <label>Required Skills</label>
        <select value={skills} onChange={handleSkillChange} required>
          <option value="">-- Select a skill --</option>
          {allSkills.map((skill, i) => (
            <option key={i} value={skill}>
              {skill}
            </option>
          ))}
        </select>

        <label>Urgency</label>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} required>
          <option value="">-- Select --</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <label>Event Date</label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          min="2025-09-09"  //earliest date
          max="2100-12-31" //latest date
          required
        />
        <label>Start Time</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <label>End Time</label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />

        <button type="submit">Create Event</button>
      </form>
    </div>
  );
}

export default EventManagement;
