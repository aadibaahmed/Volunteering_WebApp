import React, { useEffect, useState } from "react";
import "./volunteerHist.css";

export default function VolunteerHist() {
  const [volunteerHistory, setVolunteerHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded sample data for testing
  const sampleData = [
    {
      id: 1,
      start: "2025-09-01T10:00:00",
      end: "2025-09-01T14:00:00",
      role: "Food Drive Volunteer",
      organization: "Helping Hands",
      description: "Packed and distributed food boxes for families in need.",
    },
    {
      id: 2,
      start: "2025-08-20T09:00:00",
      end: "2025-08-20T12:00:00",
      role: "Park Cleanup",
      organization: "Green Earth Org",
      description: "Collected trash and planted trees at Central Park.",
    },
  ];

  useEffect(() => {
    // Simulate API call: start with empty history
    setVolunteerHistory([]);
    setLoading(false);
  }, []);

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="timeline-container-outer">
      <h1 className="timeline-title">Volunteer History</h1>

      {/* Toggle button for testing */}
      <button
        className="toggle-btn"
        onClick={() =>
          setVolunteerHistory(
            volunteerHistory.length === 0 ? sampleData : []
          )
        }
      >
        {volunteerHistory.length === 0 ? "Show Sample History" : "Clear History"}
      </button>

      {volunteerHistory.length === 0 ? (
        <div className="timeline-content sage-box no-history">
          <p>No previous volunteer history.</p>
          <p>Get Started Today!</p>
        </div>
      ) : (
        <div className="timeline">
          {volunteerHistory.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-content sage-box">
                <span className="timeline-date">
                  {item.start && item.end
                    ? `${formatDateTime(item.start)} – ${formatDateTime(item.end)}`
                    : "No date info"}
                </span>
                <h2 className="timeline-role">{item.role || "No role info"}</h2>
                <p className="timeline-org">{item.organization || "No organization info"}</p>
                <p className="timeline-desc">{item.description || "No description available"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
