import './register.css'
import { useState } from "react";
import { api } from '../../lib/api';



export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [role, setRole] = useState("");

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
    setSuccessMsg(""); setErrors({});
    if (!validate()) return;

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }) 
      });
      setSuccessMsg("Registration successful! Please log in.");
      setEmail(""); setPassword("");
    } catch (err) {
      setErrors(prev => ({ ...prev, form: err.message }));
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>User Registration</h1>

        {errors.form && <div className="notice error">{errors.form}</div>}
        {successMsg && <div className="notice ok">{successMsg}</div>}

        <div className="inner-box">
          <label htmlFor="email">Email </label>
          <input id="email" type="email" placeholder="you@example.com" maxLength={255}
                 value={email} onChange={(e) => setEmail(e.target.value)} required />
          {errors.email && <div className="error">{errors.email}</div>}

          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" minLength={8} maxLength={12}
                 value={password} onChange={(e) => setPassword(e.target.value)} required />
          {errors.password && <div className="error">{errors.password}</div>}
          <label>Role</label>

          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Select role</option>
            <option value="admin">Admin</option>
            <option value="volunteer">Volunteer</option>
          </select>

          <button className = "Register_button" type="submit">Register</button>
        </div>
        <p className="muted">Already have an account? <a href="/login"> Log in</a></p>
      </form>
    </div>
  );
}
