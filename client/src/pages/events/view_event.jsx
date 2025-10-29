import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../assets/header_after/header_after';
import './view_event.css';
import { api } from '../../lib/api';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event details.");
      }
    };
    fetchEvent();
  }, [id]);

  const handleSignUp = async () => {
    try {
      await api.post(`/events/signup/${id}`);
      alert("Successfully signed up!");
      navigate('/events');
    } catch (err) {
      console.error("Sign up failed:", err);
      alert("Failed to sign up.");
    }
  };

  if (error) return <p>{error}</p>;
  if (!event) return <p>Loading...</p>;

  return (
    <div className="event-details-page">
      <Header />
      <div className="event-details-container">
        <h1 className="event-title">{event.eventName}</h1>
        <p className="event-description">{event.description}</p>

        <div className="event-info">
          <p><strong>Urgency:</strong> {event.urgency}</p>
          <p><strong>Skills Required:</strong> 
            {Array.isArray(event.skills)
                ? event.skills.join(', ')
                : event.skills?.replace(/[{}]/g, '').split(',').join(', ')}
            </p>
          <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Start:</strong> {event.startTime}</p>
          <p><strong>End:</strong> {event.endTime}</p>
        </div>

        <div className="button-group">
          <button className="signup-button" onClick={handleSignUp}>
            Sign Up
          </button>
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventDetails;
