import React from 'react'
import './header_before.css'
import { Link } from "react-router-dom";



function HeaderBefore() {
const header_items = [
        { title: "Events", link: `/allevents` },
        { title: "About Us", link: `/aboutus` }
      ]
  return (
    <header className="header">
            <div className="container">
                <nav className="nav">
                    <div className="logo">
                        <h1 style={{color:"white"}}>Volunteer Org</h1>
                    </div>
                    {/* <div>
                        <Notifications />
                    </div> */}
                    <div className="nav-links">
                        <>
                            {header_items.map((item) => (
                                <Link key={item.title} to={item.link} className="link">
                                    {item.title}
                                </Link>
                            ))}
                            <Link className="button" to="/login">
                                Login
                            </Link>
                        </>
                    </div>
                </nav>
            </div>
    </header>
  )
}

export default HeaderBefore