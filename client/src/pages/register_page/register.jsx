import './register.css'
import { useState } from "react";
import { api } from '../../lib/api';
import HeaderBefore from '../../assets/header_before/header_before';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
    if (!password.trim()) e.password = "Password is required.";
    else if (password.length < 8 || password.length > 12) e.password = "Password must be 8–12 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrors({});
    if (!validate()) return;

    try {
      await api.post('/auth/register', { email, password });
      setSuccessMsg("Registration successful! Please log in to complete your profile.");
      // Redirect to login so the user signs in before profile completion
      navigate('/login');
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        form: err.response?.data?.error || err.message
      }));
    }    
  };

  return (
    <div className="Register_Page">
      <HeaderBefore />
      <main className="register-main">
        <div className="register-hero">
          <h1 className="welcome">Create Your Account</h1>
          <p className="subtitle">Join our community and start making an impact</p>
        </div>

        <div className="Register_Container">
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            {errors.form && <div className="notice error">{errors.form}</div>}
            {successMsg && <div className="notice ok">{successMsg}</div>}

            <div className="Form_Entries">
              <label className="Form_Entry" htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="Enter Your Email" maxLength={255}
                     value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {errors.email && <div className="error-text">{errors.email}</div>}

            <div className="Form_Entries">
              <label className="Form_Entry" htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Enter Your Password" minLength={8} maxLength={12}
                     value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {errors.password && <div className="error-text">{errors.password}</div>}

            <div className="RegisterPage_Button">
              <button className="register_button" type="submit">Register</button>
              <Link to="/login">
                <button type="button" className="outline_button">Login</button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
