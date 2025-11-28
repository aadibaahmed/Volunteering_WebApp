import { useState, useEffect } from "react";
import { FaHandsHelping, FaCalendarAlt, FaUsers, FaChartBar } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import './user_dashboard.css'
import Header from '../../assets/header_after/header_after'
import { api } from '../../lib/api';

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [totalVolunteers, setTotalVolunteers] = useState(0); // events volunteered
  const [totalEvents, setTotalEvents] = useState(0); // upcoming events
  const [activeOpportunities, setActiveOpportunities] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0); // unread notifications
  const [totalHours, setTotalHours] = useState(0);
  const [error, setError] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  // const [event_dates, setEventDates] = useState();

  const today = new Date();

  console.log(today)

  const get_diff = async (event_day, event_id, user_id) => {
  const eventDate = new Date(event_day);
  const diffMs = eventDate - today;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const notifiedData = JSON.parse(localStorage.getItem("notifiedEventsByUser")) || {};

  const userNotifiedEvents = notifiedData[user_id] || [];

  if (userNotifiedEvents.includes(event_id)) {
    return;
  }

  if (diffDays <= 2 && diffDays >= 0) {
    try {
      const res = await api.post('/insert_notif', {
        user_id,
        event_id,
        message: "There is an upcoming event that you are signed up for!",
        unread: true,
        type: "Event",
        priority: "high",
      });

      console.log("Notification inserted:", res.data);

      notifiedData[user_id] = [...userNotifiedEvents, event_id];
      localStorage.setItem("notifiedEventsByUser", JSON.stringify(notifiedData));

    } catch (err) {
      console.error("Error inserting notification:", err);
    }
  }
};


  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("No token found. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        const response = await api.get('/volunteer-dashboard');

        const data = response.data || {};
        const profile = data.profile || {};
        const stats = data.statistics || {};
        const upcoming = Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [];
        const dashboardCounts = data.dashboardCounts || {};
        const unread = data.notifications?.unread ?? 0;
        

        if (profile && profile.completed === false) {
          navigate('/account');
          return;
        }
        setUpcoming(upcoming)

        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");

        // Events volunteered -> use total events in history
        setTotalVolunteers(Number(stats.totalEvents || 0));
        // Upcoming events count
        setTotalEvents(dashboardCounts.upcomingSignedUp ?? 0);
        // Active opportunities -> treat as count of upcoming for now
        setActiveOpportunities(dashboardCounts.totalActive ?? 0);
        // Pending approvals -> unread notifications
        setPendingApprovals(Number(unread || 0));
        // Total hours volunteered
        setTotalHours(Number(stats.totalHours || 0));

      } catch (e) {
        console.error("Error fetching volunteer dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };


    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    if (upcoming.length === 0) return;

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    upcoming.forEach(event => {
      if (event.event_date) {
        get_diff(event.event_date, event.event_id, user.id);
      }
    });
  }, [upcoming]);

  return (
    <div className="volunteer-dashboard-page">

      <div className="dashboard-container">
        <div className="dashboard-header">
            <Header />
          <h1 className="dashboard-title">Volunteer Dashboard</h1>

          <div className="dashboard-welcome">
            <div className="welcome-message">
              <h2>Welcome back, {firstName} {lastName}</h2>
              <p>Here’s your volunteering overview</p>
            </div>

            <div className="current-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="dashboard-stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><FaUsers /></div>
                <div className="stat-content">
                  <h3>Events Volunteered</h3>
                  <p className="stat-value">{Number(totalVolunteers || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaCalendarAlt /></div>
                <div className="stat-content">
                  <h3>Upcoming Events</h3>
                  <p className="stat-value">{Number(totalEvents || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaHandsHelping /></div>
                <div className="stat-content">
                  <h3>Active Events</h3>
                  <p className="stat-value">{Number(activeOpportunities || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaChartBar /></div>
                <div className="stat-content">
                  <h3>Total Hours Volunteered</h3>
                  <p className="stat-value">{totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs</p>
                </div>
              </div>

              <div className="stat-card alert-card">
                <div className="stat-icon"><FaUsers /></div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <p className="stat-value">{Number(pendingApprovals || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="dashboard-section">
                <div className="section-header">
                  <h2>Upcoming Events</h2>
                </div>

                <div className="upcoming">
                  {upcoming.length === 0 ? (
                    <p className="no-upcoming">No upcoming events.</p>
                  ) : (
                    upcoming.map(event => (
                      <div className="event-card" key={event.event_id}>
                        <div className="event-card-header">
                          <h3>{event.name}</h3>
                          <span className="event-date">
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <p className="event-location">
                          <strong>Location:</strong> {event.location}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
