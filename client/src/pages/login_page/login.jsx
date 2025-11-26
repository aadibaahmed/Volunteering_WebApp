import './login.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import HeaderBefore from '../../assets/header_before/header_before';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'superuser') {
        nav('/managerdash');
      } else if (data.user.role === 'user') {
        try {
          const me = await api.get('/profile/me');
          const profile = me.data || null;

          if (!profile || profile.completed === false) {
            try {
              await api.post('/insert_notif_on_register', {
                user_id: data.user.id,
                message: "Welcome! Thank you for joining, check out all events in the EVENT tab!",
                unread: true,
                type: "welcome",
                priority: "low",
              });
            } catch (notifErr) {
              console.error("Failed to insert welcome notification:", notifErr);
            }

            nav('/account');
          } else {
            nav('/volunteerdash');
          }
        } catch {
          nav('/account');
        }
      } else {
        nav('/');
      }
    } catch (err) {
      setErr(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Login_Page">
      <HeaderBefore />
      <main className="login-main">
        <div className="login-hero">
          <h1 className="welcome">Welcome Back</h1>
          <p className="subtitle">Sign in to continue making an impact</p>
        </div>

        <div className="Login_Container">
          <form id="Login_Form" className="login-form" onSubmit={handleSubmit}>
            {err && <div className="notice error">{err}</div>}

            <div className="Form_Entries">
              <label className="Form_Entry">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                className="form-input"
                placeholder="Enter Your Email"
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="Form_Entries">
              <label className="Form_Entry">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                className="form-input"
                placeholder="Enter Your Password"
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="LoginPage_Button">
              <button type="submit" className="login_button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <Link to="/register">
                <button type="button" className="outline_button">
                  Register
                </button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
