import './header_after.css';
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import Notifications from '../extra_assets/notifications/notifications.jsx';

function Header() {
    const navigate = useNavigate();
    const [role, setRole] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setRole(user.role);
        }
    }, []);

    const userHeaderItems = [
        { title: "Dashboard", link: `/volunteerdash` },
        { title: "Events", link: `/allevents` },
        { title: "Account", link: `/account` },
        { title: "Volunteer History", link: `/history` }
    ];

    const superuserHeaderItems = [
        { title: "Overview", link: `/managerdash` },
        { title: "Volunteers", link: `/managerdash/volunteers` },
        { title: "Events", link: `/managerdash/events` },
        { title: "Matching", link: `/managerdash/matching` },
        { title: "Notifications", link: `/managerdash/notifications` },
        
        { title: "Reports", link: `/managerdash/reports` },

        { title: "Account", link: `/account` }
    ];

    const headerItems = role === 'superuser' ? superuserHeaderItems : userHeaderItems;

    if (!role) return null;

    return (
        <header className="header">
            <div className="container">
                <nav className="nav">
                    <div className="logo">
                        <h1 style={{ color: "white" }}>ImpactMatch</h1>
                    </div>

                    <div className="nav-links">
                        {role !== 'superuser' && <Notifications />}

                        {headerItems.map((item) => (
                            <Link key={item.title} to={item.link} className="link">
                                {item.title}
                            </Link>
                        ))}

                        <Link
                            className="button"
                            to="/"
                            onClick={(e) => {
                                e.preventDefault();
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                navigate('/');
                            }}
                        >
                            Logout
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Header;
