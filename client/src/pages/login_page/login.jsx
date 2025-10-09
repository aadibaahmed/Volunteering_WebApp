import './login.css'
import { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { api } from '../../lib/api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (!data.user.completed) nav('/account');   // force profile completion
      else nav('/');
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="Login_Page">
      <h1 className='welcome'>Welcome To The Login Page</h1>
      <div className="Login_Container">
        <form id="Login_Form" className='login-form' onSubmit={handleSubmit}>
          {err && <div className="notice error">{err}</div>}
          <div className='Form_Entries'>
            <label className='Form_Entry'>Email</label>
            <input id="email" type="email" value={email}
                   className="form-input" placeholder="Enter Your Email"
                   maxLength={255} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className='Form_Entries'>
            <label className='Form_Entry'>Password</label>
            <input id="password" type="password" value={password}
                   className="form-input" placeholder="Enter Your Password"
                   maxLength={72} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className='LoginPage_Button'>
            <button type="submit" className='login_button'>Login</button>
            <Link to="/register"><button type="button" className='login_button'>Register</button></Link>
          </div>
        </form>
      </div>
    </div>
  )
}
