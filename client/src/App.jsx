import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/home_page/homepage.jsx';
import Account from './pages/account_page/account.jsx';
import Login from './pages/login_page/login.jsx';
import Register from './pages/register_page/register.jsx';
import EventManagement from './pages/admin_side/event_management.jsx';
import VolunteerMatch from './pages/admin_side/volunteer_match.jsx';
import VolunteerHist from './pages/volunteerHist_page/volunteerHist.jsx';
import AboutUs from './pages/about_us/about_us.jsx';
import VolunteerDashboard from './pages/user_dashboard/user_dashboard.jsx';
import Events from './pages/events/events.jsx';
import EventList from './pages/admin_side/event_list.jsx';
import ManagerDashboard from './pages/admin_side/manager_dashboard.jsx';
import './App.css';

function Protected({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<HomePage />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/allevents" element={<Events />} />

      {/* SHARED ROUTES */}
      <Route
        path="/account"
        element={
          <Protected allowedRoles={['user', 'superuser']}>
            <Account />
          </Protected>
        }
      />
      <Route
        path="/history"
        element={
          <Protected allowedRoles={['user']}>
            <VolunteerHist />
          </Protected>
        }
      />

      {/* VOLUNTEER DASHBOARD */}
      <Route
        path="/volunteerdash"
        element={
          <Protected allowedRoles={['user']}>
            <VolunteerDashboard />
          </Protected>
        }
      />

      {/* MANAGER / SUPERUSER DASHBOARD */}
      <Route
        path="/managerdash"
        element={
          <Protected allowedRoles={['superuser']}>
            <ManagerDashboard />
          </Protected>
        }
      />

      <Route
        path="/eventmanagement"
        element={
          <Protected allowedRoles={['superuser']}>
            <EventManagement />
          </Protected>
        }
      />



      <Route
        path="/volunteermatch"
        element={
          <Protected allowedRoles={['superuser']}>
            <VolunteerMatch />
          </Protected>
        }
      />
      <Route
        path="/eventlist"
        element={
          <Protected allowedRoles={['superuser']}>
            <EventList />
          </Protected>
        }
      />
    </Routes>
  );
}
