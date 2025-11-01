import { useState, useEffect } from "react";
import { FaHandsHelping, FaCalendarAlt, FaUsers, FaChartBar, FaHandHoldingHeart } from 'react-icons/fa';
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import './user_dashboard.css'
import Header from '../../assets/header_after/header_after'

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

  const [loading, setLoading] = useState(false);

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

        const response = await axios.get(`${import.meta.env.VITE_API_BASE}/volunteer-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data || {};
        const profile = data.profile || {};
        const stats = data.statistics || {};
        const upcoming = Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [];
        const unread = data.notifications?.unread ?? 0;

        if (profile && profile.completed === false) {
          navigate('/account');
          return;
        }

        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");

        // Events volunteered -> use total events in history
        setTotalVolunteers(Number(stats.totalEvents || 0));
        // Upcoming events count
        setTotalEvents(upcoming.length);
        // Active opportunities -> treat as count of upcoming for now
        setActiveOpportunities(upcoming.length);
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
                  <h2>Quick Actions</h2>
                </div>

                <div className="quick-actions">
                  <Link to="/allevents" className="action-button">
                    <FaCalendarAlt className="icon" />
                    <span>View Events</span>
                  </Link>

                  <Link to="/volunteer/opportunities" className="action-button">
                    <FaHandsHelping className="icon" />
                    <span>Find Opportunities</span>
                  </Link>

                  <Link to="/volunteer/reports" className="action-button">
                    <FaChartBar className="icon" />
                    <span>View Reports</span>
                  </Link>
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
