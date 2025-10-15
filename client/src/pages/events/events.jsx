import React from 'react'
import Header from '../../assets/header_after/header_after'
import './events.css'

function Events() {
  const sample_events = [
    { name: "Event A", date: "10-20-2028" },
    { name: "Event B", date: "10-21-2028" },
    { name: "Event C", date: "10-22-2028" },
  ]

  const renderTable = (title, items) => (
    <div className="status-section">
      {items.length === 0 ? (
        <p>No {title.toLowerCase()} found.</p>
      ) : (
        <div className="table-container">
          <h2 className="table-title">{title}</h2>
          <table className="events-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event, index) => (
                <tr key={index}>
                  <td>{event.name}</td>
                  <td>{event.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="events-dashboard-page">
      <div className="events-container">
        <Header />
        <div className="events-header">
          <h1 className="events-title">
            THIS IS WHERE ALL THE EVENTS WILL BE LISTED
          </h1>
        </div>
        {renderTable("Upcoming Events", sample_events)}
      </div>
    </div>
  )
}

export default Events
