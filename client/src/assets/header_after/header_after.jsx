import React from 'react'
import './header_after.css'
import { Link } from "react-router-dom";
import Notifications from '../extra_assets/notifications/notifications.jsx'



function HeaderBefore() {
  const header_items = [
          { title: "Events", link: `/events` },
          { title: "About Us", link: `/aboutus` }
        ]
    return (
    <header className="header">
            <div className="container">
                <nav className="nav">
                    <div className="logo">
                        <h1 style={{color:"white"}}>Volunteer Org</h1>
                    </div>
                    <div className="nav-links">
                        <>
                            <Notifications />

                            {header_items.map((item) => (
                                <Link key={item.title} to={item.link} className="link">
                                    {item.title}
                                </Link>
                            ))}

                            {/* need to add log out where it clears local storage, tmr me problem. */}
                          <Link className="button" to="/login">
                              Logout
                          </Link>
                        </>
                    </div>
                </nav>
            </div>
    </header>
  )
}

export default HeaderBefore