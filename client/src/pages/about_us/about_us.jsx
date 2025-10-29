import './about_us.css'
import HeaderBefore from '../../assets/header_before/header_before'
import { Link } from 'react-router-dom'

function AboutUs() {
  return (
    <div className="aboutus-page">
      <HeaderBefore />
      <main className="aboutus-main">
        <div className="text-section">
          <h1>About Our Community</h1>
          <p>
            We are a passionate group of volunteers dedicated to making a positive impact in our community. 
            Through teamwork, compassion, and service, we aim to create meaningful change and inspire others 
            to join our mission.
          </p>
          <div className="buttons">
            <Link className="cta-btn" to="/allevents">
              Explore Events
            </Link>
            <Link className="outline-btn" to="/register">
              Join Our Team
            </Link>
          </div>
        </div>
      </main>

      <section className="contact-section">
        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:info@volunteerhub.com">info@volunteerhub.com</a></p>
        <p>Phone: <a href="tel:+1234567890">+1 (123) 456-789</a></p>
      </section>
    </div>
  )
}

export default AboutUs
