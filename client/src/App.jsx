import { Routes, Route} from 'react-router-dom'
import HomePage from './pages/home_page/homepage.jsx'
import Account from './pages/account_page/account.jsx'
import Login from './pages/login_page/login.jsx'
import './App.css'

function App() {

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/account" element={<Account />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
