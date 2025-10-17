import React from 'react'
import { useState } from 'react'
import Header from '../../assets/header_after/header_after'
import axios from 'axios'
import './events.css'

function Events() {

  const [event_name, setEvent_Name] = useState("");
  const [event_date, setEvent_Date] = useState("");



  const getEvents = async (events) => {
    e.preventDefault(); 
        setErr("");
        try {
          const res = await axios.get('/events') 
          setEvent_Name(res.name)
          setEvent_Date(res.date)

        } catch (e) {
          setErr(e.message);
        }
  }
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
