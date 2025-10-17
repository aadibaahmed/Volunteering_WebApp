import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/home_page/homepage.jsx'
import Account from './pages/account_page/account.jsx'
import Login from './pages/login_page/login.jsx'
import Register from './pages/register_page/register.jsx'
import EventManagement from './pages/admin_side/event_management.jsx'
import VolunteerMatch from './pages/admin_side/volunteer_match.jsx'
import VolunteerHist from './pages/volunteerHist_page/volunteerHist.jsx'
import AboutUs from './pages/about_us/about_us.jsx'
import VolunteerDashboard from './pages/user_dashboard/user_dashboard.jsx'
import Events from './pages/events/events.jsx'
import EventList from './pages/admin_side/event_list.jsx';

import './App.css'

function Protected({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* USERS */}
      <Route path="/" element={<HomePage />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/account" element={<Protected><Account /></Protected>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register/>} />
      <Route path="/history" element={<VolunteerHist/>} />
      <Route path="/userdash" element={<VolunteerDashboard/>} />
      <Route path="/allevents" element={<Events/>} />

      
      

      {/* ADMINS */}
      <Route path="/eventmanagement" element={<EventManagement />} />
      <Route path="/volunteermatch" element={<VolunteerMatch />} />
      <Route path="/eventlist" element={<EventList />} />

    </Routes>
  )
}
