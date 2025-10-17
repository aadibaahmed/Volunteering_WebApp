import './homepage.css'
import HeaderBefore from '../../assets/header_before/header_before'
import { Link } from 'react-router-dom'
import volunteerPicture from '../../assets/extra_assets/volunteering-people.jpg'

function Homepage() {
  return (
    <div className="homepage">
      <HeaderBefore />
      <main className="homepage-main">
        <div className="text-section">
          <h1>Make a Difference in Your Community</h1>
          <p>
            Join our volunteering community and create a lasting impact through service, compassion, and teamwork.
            Whether you’re new or returning, your time and skills truly matter.
          </p>
          <div className="buttons">
            <Link className="cta-btn" to="/events">
              View Events
            </Link>
            <Link className="outline-btn" to="/register">
              Join Now
            </Link>
          </div>
        </div>

        <div className="image-section">
          <img src={volunteerPicture} alt="Volunteer icon" />
        </div>
      </main>
    </div>
  )
}

export default Homepage
