import { Routes, Route} from 'react-router-dom'
import HomePage from './pages/home_page/homepage.jsx'
import Account from './pages/account_page/account.jsx'
import Login from './pages/login_page/login.jsx'
import Register from './pages/register_page/register.jsx'
import EventManagement from './pages/admin_side/event_management.jsx'
import VolunteerMatch from './pages/admin_side/volunteer_match.jsx'
import VolunteerHist from './pages/volunteerHist_page/volunteerHist.jsx'
import './App.css'

function App() {

  return (
    <Routes>

      {/* USERS */}
      <Route path="/" element={<HomePage />} />
      <Route path="/account" element={<Account />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register/>} />
      <Route path="/history" element={<VolunteerHist/>} />

      {/* ADMINS */}
      <Route path="/eventmanagement" element={<EventManagement />} />
      <Route path="/volunteermatch" element={<VolunteerMatch />} />



    </Routes>
  )
}

export default App
