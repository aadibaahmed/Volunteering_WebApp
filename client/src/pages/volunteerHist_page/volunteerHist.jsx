import React from "react";
import "./volunteerHist.css";

export default function VolunteerHist() {
  const volunteerHistory = [
    {
      id: 1,
      role: "Event Helper",
      organization: "Community Center",
      start: "2020-09-12T09:00",
      end: "2020-09-12T14:00",
      description: "Helped set up and run a charity fundraising event."
    },
    {
      id: 2,
      role: "Volunteer Coordinator",
      organization: "Local Food Bank",
      start: "2021-01-10T08:30",
      end: "2022-05-15T17:00",
      description:
        "Organized volunteer shifts, managed food donations, and trained new volunteers."
    },
    {
      id: 3,
      role: "Disaster Relief Volunteer",
      organization: "Red Cross",
      start: "2022-06-05T10:00",
      end: "2022-08-20T16:30",
      description:
        "Assisted with relief efforts, distributed supplies, and helped families relocate."
    }
  ];

  // format helper
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <div className="timeline-container">
      <h1 className="timeline-title">Volunteer History</h1>
      <div className="timeline">
        {volunteerHistory.map((item) => (
          <div key={item.id} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <span className="timeline-date">
                {formatDateTime(item.start)} – {formatDateTime(item.end)}
              </span>
              <h2 className="timeline-role">{item.role}</h2>
              <p className="timeline-org">{item.organization}</p>
              <p className="timeline-desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
