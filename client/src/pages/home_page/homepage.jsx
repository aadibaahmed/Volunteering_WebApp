import './homepage.css'
import HeaderBefore from '../../assets/header_before/header_before'
import { Link } from 'react-router-dom'

function Homepage() {
  return (
    <div className="homepage">
      <HeaderBefore />
      <main className="homepage-main">
        <div className="content">
          <div className="text-section">
            <h1>Welcome to our Volunteering Organization</h1>
            <p>
              Join our volunteering community and make a difference in this world.
              Whether you’re new or returning, your time and skills matter.
            </p>
            <div className="buttons">
              <Link className="login-btn" to="/login">
                  Log in
              </Link>
              <Link className="signup-btn" to="/register">
                  Register
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Homepage
