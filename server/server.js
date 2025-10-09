import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './database.js';
import db_health from './DB_health/health.routes.js';

import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js'


const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'invalid token' }); }
}

const sign = (u) =>
  jwt.sign({ sub: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '2h' });

// these are being used to check if every thing is functional
app.get('/', (_req, res) => res.send('OK'));
app.use(db_health);


// PUT ROUTES FOR PROJECT HERE
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);


app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});


