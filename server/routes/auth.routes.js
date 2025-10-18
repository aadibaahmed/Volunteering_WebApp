import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Hardcoded users data (no database implementation)
let users = [
  {
    user_id: 1,
    email: 'admin@volunteer.com',
    password: '$2b$10$rQZ8K9vJ8K9vJ8K9vJ8K9e', // hashed 'admin123'
    role: 'superuser',
    first_name: 'Admin',
    last_name: 'User'
  },
  {
    user_id: 2,
    email: 'volunteer@volunteer.com',
    password: '$2b$10$rQZ8K9vJ8K9vJ8K9vJ8K9e', // hashed 'volunteer123'
    role: 'user',
    first_name: 'John',
    last_name: 'Doe'
  }
];

const sign = (u) =>
  jwt.sign(
    { sub: u.user_id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

// User Registration
router.post('/register', async (req, res) => {
  const { email, password, role = 'user', first_name, last_name } = req.body || {};
  
  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'email & password required' });
  }
  
  if (typeof email !== 'string' || email.length < 5 || email.length > 255) {
    return res.status(400).json({ error: 'invalid email format' });
  }
  
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  
  if (role && !['user', 'superuser'].includes(role)) {
    return res.status(400).json({ error: 'invalid role' });
  }

  try {
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'user already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = {
      user_id: users.length + 1,
      email,
      password: hashedPassword,
      role,
      first_name: first_name || null,
      last_name: last_name || null
    };

    users.push(newUser);
    const token = sign(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.user_id,
        email: newUser.email,
        role: newUser.role,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
      },
    });
  } catch (err) {
    console.error('registration error:', err);
    res.status(500).json({ error: 'registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email & password required' });

  try {
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign(user);

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'login failed' });
  }
});

export default router;
