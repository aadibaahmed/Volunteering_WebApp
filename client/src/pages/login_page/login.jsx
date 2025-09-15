import React from 'react'
import './login.css'
import { useState } from 'react'

function login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  console.log(email, password)

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Attempted to log in")


    // add the routing to the backend and send the email and password;

  }



  return (
    <div className = "Login_Page">
      <h1 className='welcome'> Welcome To The Login Page</h1>
      <div className = "Login_Container">
        <form id = "Login_Form" className = 'login-form' onSubmit={handleSubmit}>
          <div className='Form_Entries'>
            <label className='Form_Entry'>Email </label>
              <input 
                id="email"
                type="text"
                value = {email} 
                className="form-input"
                placeholder="Enter Your Email"
                minLength={7}
                maxLength={255}

                onChange={(e) => setEmail(e.target.value)}
              />

          </div>

          <div className='Form_Entries'>
            <label className='Form_Entry'>Password </label>
              <input 
                id="password"
                type="password"
                value = {password}
                className="form-input"
                placeholder="Enter Your Password"
                minLength={7}
                maxLength={20}

                onChange={(e) => setPassword(e.target.value)}
              />
          </div>
          <div className = 'LoginPage_Button'>
            <button type = "submit" className= 'login_button'>Login</button>
            <button className='login_button'>Register</button>
          </div>
  

        </form>

      </div>
    </div>
  )
}

export default login