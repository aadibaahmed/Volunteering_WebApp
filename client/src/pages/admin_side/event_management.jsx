import React, { useState } from "react";
import "./event_management.css";
import { eventApi } from "../../lib/managerApi.js";

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

  const allSkills = [
    "First Aid", "CPR", "Teaching", "Event Setup", "Food Service",
    "Crowd Control", "Logistics", "Cooking", "Cleaning", "Organizing"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!eventName || !eventDescription || !location || !skills.length || !urgency || !eventDate || !startTime || !endTime) {
      alert("Please fill out all required fields.");
      return;
    }
    
    const formData = {
      event_name: eventName,
      event_description: eventDescription,
      location: location,
      required_skills: skills,
      urgency: urgency,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
    };
    

    console.log("Sending data:", formData); 

    try {
      const res = await eventApi.createEvent(formData);
      setSuccessMsg(res.message || "Event created successfully!");
      console.log("Event created:", res.event);
      alert("Event created successfully!");

      // reset form
      setEventName("");
      setEventDescription("");
      setLocation("");
      setSkills([]);
      setUrgency("");
      setEventDate("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      console.error("Error creating event:", error);
      console.error("Error response:", error.response);
      alert(`Failed to create event: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSkillChange = (e) => {
    const selectedSkill = e.target.value;
    if (selectedSkill && !skills.includes(selectedSkill)) {
      setSkills([...skills, selectedSkill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="event-wrapper">
      <form className="event-card" onSubmit={handleSubmit}>
        <h1>Create Event</h1>
        {successMsg && <div className="notice ok">{successMsg}</div>}

        <label>Event Name *</label>
        <input 
          type="text" 
          value={eventName} 
          onChange={(e) => setEventName(e.target.value)} 
          required 
        />

        <label>Event Description *</label>
        <textarea 
          value={eventDescription} 
          onChange={(e) => setEventDescription(e.target.value)} 
          required 
        />

        <label>Location *</label>
        <input 
          type="text" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)} 
          required 
        />

        <label>Required Skills *</label>
        <select onChange={handleSkillChange} defaultValue="">
          <option value="">-- Select skills --</option>
          {allSkills.map((skill, i) => (
            <option key={i} value={skill}>{skill}</option>
          ))}
        </select>
        
        {/* Show selected skills */}
        <div className="selected-skills">
          {skills.map((skill, index) => (
            <span key={index} className="skill-tag">
              {skill}
              <button type="button" onClick={() => removeSkill(skill)}>×</button>
            </span>
          ))}
        </div>

        <label>Urgency *</label>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} required>
          <option value="">-- Select --</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <label>Event Date *</label>
        <input 
          type="date" 
          value={eventDate} 
          onChange={(e) => setEventDate(e.target.value)} 
          required 
        />

        <label>Start Time *</label>
        <input 
          type="time" 
          value={startTime} 
          onChange={(e) => setStartTime(e.target.value)} 
          required 
        />

        <label>End Time *</label>
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