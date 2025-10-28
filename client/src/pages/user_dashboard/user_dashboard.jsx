import { useState, useEffect } from "react";
import { FaHandsHelping, FaCalendarAlt, FaUsers, FaChartBar, FaHandHoldingHeart } from 'react-icons/fa';
import axios from "axios";
import { Link } from "react-router-dom";
import './user_dashboard.css'
import Header from '../../assets/header_after/header_after'

const VolunteerDashboard = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [totalVolunteers, setTotalVolunteers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeOpportunities, setActiveOpportunities] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

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

        // Simulated API call
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/volunteer-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setTotalVolunteers(data.totalVolunteers);
        setTotalEvents(data.totalEvents);
        setActiveOpportunities(data.activeOpportunities);
        setPendingApprovals(data.pendingApprovals);
        setTotalHours(data.totalHours);
        setDonations(data.donations);

      } catch (error) {
        console.error("Error fetching volunteer dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
                  <p className="stat-value">{totalVolunteers.toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaCalendarAlt /></div>
                <div className="stat-content">
                  <h3>Upcoming Events</h3>
                  <p className="stat-value">{totalEvents.toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaHandsHelping /></div>
                <div className="stat-content">
                  <h3>Active Events</h3>
                  <p className="stat-value">{activeOpportunities}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><FaChartBar /></div>
                <div className="stat-content">
                  <h3>Total Hours Volunteered</h3>
                  <p className="stat-value">{totalHours.toLocaleString()} hrs</p>
                </div>
              </div>

              <div className="stat-card alert-card">
                <div className="stat-icon"><FaUsers /></div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <p className="stat-value">{pendingApprovals}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="dashboard-section">
                <div className="section-header">
                  <h2>Quick Actions</h2>
                </div>

                <div className="quick-actions">
                  <Link to="/events" className="action-button">
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
