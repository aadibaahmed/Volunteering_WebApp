import React, { useEffect, useState } from "react";
import "./volunteerHist.css";
import Header from '../../assets/header_after/header_after';


export default function VolunteerHist() {
  const [volunteerHistory, setVolunteerHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const volunteerId = 9; // you’ll replace this with the logged-in volunteer’s ID

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/volunteer-history?volunteer_id=${volunteerId}`);
        const data = await response.json();
        setVolunteerHistory(data);
      } catch (error) {
        console.error("Error fetching volunteer history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [volunteerId]);

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <>
    <Header />  
    <div className="timeline-container-outer">
      <h1 className="timeline-title">Volunteer History</h1>

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
                <p className="timeline-desc">{item.role || "No description available"}</p>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
