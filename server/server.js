import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './database.js';
import { requireAuth } from './middleware/auth.js';

import eventRoutes from "./routes/event.routes.js";

import db_health from './DB_health/health.routes.js';
import profile_routes from './routes/profile.routes.js';
import auth_routes from './routes/auth.routes.js'
import notif_routes from './routes/notifs.routes.js'
import all_events_route from './routes/allevents.routes.js'
import volunteer_matching_routes from './routes/volunteer_matching.routes.js'
import volunteer_history_routes from './routes/volunteer_history.routes.js'
import VolunteerHist from './routes/volunteerHist.routes.js'

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

const sign = (u) =>
  jwt.sign({ sub: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '2h' });

app.get('/', (_req, res) => res.send('OK'));

app.use(db_health);

app.use('/api/auth', auth_routes); 

app.use('/api/profile', profile_routes);

app.use("/api/events", eventRoutes);

app.use('/api', notif_routes);

app.use('/api', all_events_route);

app.use('/api/volunteer-matching', volunteer_matching_routes);

app.use('/api/volunteer-history', VolunteerHist);

export default app;

// Only start the server when not running tests
if (process.env.NODE_ENV !== 'test') {

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

}