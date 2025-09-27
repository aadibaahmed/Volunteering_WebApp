import React, { useEffect, useState } from "react";
import "./volunteerHist.css";

export default function VolunteerHist() {
  const [volunteerHistory, setVolunteerHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch volunteer data from your API
  useEffect(() => {
    fetch("/api/volunteers")
      .then((res) => res.json())
      .then((data) => {
        // Right now, there's no history, so this will be empty
        setVolunteerHistory(data.length ? data : []); 
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setVolunteerHistory([]);
        setLoading(false);
      });
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
    <div className="timeline-container">
      <h1 className="timeline-title">Volunteer History</h1>
      {volunteerHistory.length === 0 ? (
        <div className="timeline-content no-history">
          <p>No previous volunteer history.</p>
          <p>Get Started Today!</p>
        </div>
      ) : (
        <div className="timeline">
          {volunteerHistory.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-content">
                <span className="timeline-date">
                  {item.start && item.end
                    ? `${formatDateTime(item.start)} – ${formatDateTime(
                        item.end
                      )}`
                    : "No date info"}
                </span>
                <h2 className="timeline-role">{item.role || "No role info"}</h2>
                <p className="timeline-org">
                  {item.organization || "No organization info"}
                </p>
                <p className="timeline-desc">
                  {item.description || "No description available"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
