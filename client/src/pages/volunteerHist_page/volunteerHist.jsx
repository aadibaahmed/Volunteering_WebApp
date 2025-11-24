import React, { useEffect, useState } from "react";
import "./volunteerHist.css";
import Header from "../../assets/header_after/header_after";
import axios from "axios";
import { Link } from "react-router-dom";

export default function VolunteerHist() {
  const [volunteerHistory, setVolunteerHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("No token found. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        const apiBase = import.meta.env.VITE_API_BASE || '';
        const apiUrl = `${apiBase}/api/volunteer-history`;
        
        console.log("🔍 Fetching volunteer history from:", apiUrl);


        const response = await axios.get(
          apiUrl,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = response.data;
        console.log("Volunteer history response:", data);


        if (typeof data === 'string' && data.trim().startsWith('<!doctype html>')) {
          console.error("The API returned an HTML page instead of JSON. Check server routing!");
          setError("API Error: The server returned an unexpected web page. The API base path is likely misconfigured.");
          setVolunteerHistory([]);
          return;
        }


        if (Array.isArray(data)) {
          setVolunteerHistory(data);
        } else if (Array.isArray(data.history)) {
          // This path is usually for grouped data; we expect the top-level array
          setVolunteerHistory(data.history); 
        } else {
          console.error("Unexpected response format:", data);
          setVolunteerHistory([]);
        }
      } catch (error) {
        console.error("Error fetching volunteer history:", error);
        setError("Failed to load volunteer history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "No date info";
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to format the hours string
  const formatHours = (hours) => {
    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0) return "N/A";
    
    return `${numHours.toFixed(1)} hours`;
  };

  if (loading)
    return (
      <>
        <Header />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading volunteer history...</p>
        </div>
      </>
    );

  if (error)
    return (
      <>
        <Header />
        <p className="error-message">Error: {error}</p>
      </>
    );

  return (
    <>
      <Header />
      <div className="timeline-container-outer">
        <h1 className="timeline-title">Volunteer History</h1>

        {volunteerHistory.length === 0 ? (
          <div className="timeline-content-box no-history"> 
            <p>No previous volunteer history.</p>
            <p>Get Started Today!</p>
          </div>
        ) : (
          <div className="timeline">
            {volunteerHistory.map((item, index) => (
              <div key={item.id || index} className="timeline-item">
                <div className="timeline-content-box"> 
                  <span className="timeline-date">
                    {item.start && item.end
                      ? `${formatDateTime(item.start)} - ${formatDateTime(item.end)}`
                      : formatDateTime(item.start)}
                  </span>
                  {/* 🆕 ADDED: Display the hours served */}
                  <h2 className="timeline-role">{item.role || "No event info"}</h2>
                  <p className="timeline-org">
                    {item.organization || "No location info"}
                  </p>
                  <p className="timeline-desc">
                    {item.description || "No description available"}
                  </p>
                  <p className="timeline-hours-served">
                  <span style={{fontWeight: 550 }}>Time Served:</span> {formatHours(item.hoursServed)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="timeline-footer-action">
          <Link to="/allevents" className="action-button-timeline">
            Find Volunteer Opportunities
          </Link>
        </div>
    </>
  );
}