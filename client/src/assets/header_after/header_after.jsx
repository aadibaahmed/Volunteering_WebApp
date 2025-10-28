import './header_after.css'
import { Link, useNavigate} from "react-router-dom";
import Notifications from '../extra_assets/notifications/notifications.jsx'



function HeaderAfter() {
    const navigate = useNavigate();

    const header_items = [
            { title: "Dashboard", link: `/userdash` },
            { title: "Events", link: `/allevents` },
            { title: "Account", link: `/account` }
            ]
            
    return (
    <header className="header">
            <div className="container">
                <nav className="nav">
                    <div className="logo">
                        <h1 style={{color:"white"}}>ImpactMatch</h1>
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
                          <Link
                            className="button"
                            to="/"
                            onClick={(e) => {
                                e.preventDefault(); // stop link navigation until cleanup
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                navigate('/');
                            }}
                            >
                            Logout
                            </Link>
                        </>
                    </div>
                </nav>
            </div>
    </header>
  )
}

export default HeaderAfter