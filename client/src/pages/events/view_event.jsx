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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event details.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleSignUp = async () => {
    try {
      const token = localStorage.getItem("token");
      const user =  JSON.parse(localStorage.getItem("user"));

      const user_id = user.id;

      if (!token) {
        alert("You must be logged in to sign up for an event.");
        navigate('/login');
        return;
      }
      const res = await api.post(
        `/events/signup/${id}`,
        {id, user_id},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Successfully signed up!");
      navigate('/allevents');
    } catch (err) {
      console.error("Sign up failed:", err);
      if (err.response?.status === 401) {
        alert("Your session expired. Please log in again.");
        navigate('/login');
      } else {
        alert("Failed to sign up. Please try again.");
      }
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="event-details-page">
      <Header />
      <div className="event-details-container">
        <h1 className="event-title">{event.eventName}</h1>
        <p className="event-description">{event.description}</p>

        <div className="event-info">
          <p><strong>Urgency:</strong> {event.urgency}</p>
          <p><strong>Skills Required:</strong> 
            {event.skills}
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
