

import express from 'express';
import request from 'supertest';

jest.mock('../../database.js', () => ({
  // Will be reassigned per test
  query: jest.fn(),
}));

jest.mock('../../middleware/auth.js', () => ({
  // Bypass real auth, attach a fake user id when route requires it
  requireAuth: (req, _res, next) => {
    req.user = { id: 123 };
    next();
  },
}));

import { query } from '../../database.js';
import eventRouter from '../event.routes.js';

// Build a minimal app with JSON + the router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRouter);
  return app;
}

describe('event.routes.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------- POST /api/events ----------
  test('POST /api/events -> 400 when required fields missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/events')
      .send({
        // missing event_name, event_date, start_time, end_time, location
        required_skills: 'first aid',
        urgency: 'High',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Missing required fields');
    expect(query).not.toHaveBeenCalled();
  });

  test('POST /api/events -> 201 success (string skills, urgency lowercased, uses req.user.id)', async () => {
    const app = buildApp();

    // what DB should return
    const fakeRow = {
      event_id: 10,
      name: 'Volunteer Fair',
      required_skills: 'first aid, leadership',
      event_description: 'desc',
      location: 'Houston',
      urgency: 'high',
      event_date: '2025-11-15',
      time_start: '09:00',
      time_end: '12:00',
      volunteer_needed: 5,
      manager_user_id: 123,
    };

    query.mockResolvedValueOnce({ rows: [fakeRow] });

    const res = await request(app)
      .post('/api/events')
      .send({
        event_name: 'Volunteer Fair',
        event_description: 'desc',
        location: 'Houston',
        required_skills: 'first aid, leadership',
        urgency: 'HIGH',               // should be lowercased by route
        event_date: '2025-11-15',
        start_time: '09:00',
        end_time: '12:00',
        volunteer_needed: 5,
      });

    expect(res.status).toBe(201);
    expect(query).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      message: 'Event created successfully!',
      event: fakeRow,
    });

    // Ensure urgency was lowercased before insert
    const args = query.mock.calls[0][1];
    // args[4] is urgencyValue in your INSERT
    expect(args[4]).toBe('high');
    // args[9] is manager_user_id (from req.user.id)
    expect(args[9]).toBe(123);
  });

  test('POST /api/events -> 500 on DB error', async () => {
    const app = buildApp();

    query.mockRejectedValueOnce(new Error('insert failed'));

    const res = await request(app)
      .post('/api/events')
      .send({
        event_name: 'Bad',
        event_description: 'x',
        location: 'HOU',
        required_skills: ['a', 'b'], // also cover array branch
        urgency: 'low',
        event_date: '2025-01-01',
        start_time: '10:00',
        end_time: '11:00',
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error creating event');
  });

  // ---------- GET /api/events ----------
  test('GET /api/events -> 200 returns array', async () => {
    const app = buildApp();

    const rows = [
      {
        id: 1,
        eventName: 'E1',
        description: 'D1',
        location: 'L1',
        skills: 's1',
        urgency: 'low',
        date: '2025-01-02',
        startTime: '10:00',
        endTime: '12:00',
        volunteerNeeded: 3,
      },
    ];
    query.mockResolvedValueOnce({ rows });

    const res = await request(app).get('/api/events');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('GET /api/events -> 500 on DB error', async () => {
    const app = buildApp();
    query.mockRejectedValueOnce(new Error('select failed'));

    const res = await request(app).get('/api/events');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error fetching events');
  });

  // ---------- PUT /api/events/:id ----------
  test('PUT /api/events/:id -> 400 when required fields missing', async () => {
    const app = buildApp();

    const res = await request(app)
      .put('/api/events/99')
      .send({
        // omit event_name, location, etc. to trigger 400
        urgency: 'high',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Missing required fields');
    expect(query).not.toHaveBeenCalled();
  });

  test('PUT /api/events/:id -> 404 when not found', async () => {
    const app = buildApp();

    query.mockResolvedValueOnce({ rows: [] }); // no rows updated

    const res = await request(app)
      .put('/api/events/999')
      .send({
        event_name: 'Updated',
        event_description: 'desc',
        location: 'HOU',
        required_skills: 'x, y',
        urgency: 'MEDIUM',
        event_date: '2025-02-02',
        start_time: '08:00',
        end_time: '09:00',
        volunteer_needed: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Event not found');
  });

  test('PUT /api/events/:id -> 200 success (array skills, default urgency low)', async () => {
    const app = buildApp();

    const updated = {
      event_id: 7,
      name: 'Updated',
      required_skills: 'x, y',
      event_description: 'desc',
      location: 'HOU',
      urgency: 'low',
      event_date: '2025-02-02',
      time_start: '08:00',
      time_end: '09:00',
      volunteer_needed: 1,
    };

    // Return one updated row
    query.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put('/api/events/7')
      .send({
        event_name: 'Updated',
        event_description: 'desc',
        location: 'HOU',
        required_skills: ['x', 'y'], // covers array->join branch
        urgency: undefined,          // covers default 'low'
        event_date: '2025-02-02',
        start_time: '08:00',
        end_time: '09:00',
        volunteer_needed: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Event updated successfully!',
      event: updated,
    });

    // Ensure skills joined & urgency defaulted to 'low' in UPDATE args
    const args = query.mock.calls[0][1];
    expect(args[1]).toBe('x, y'); // formattedSkills
    expect(args[4]).toBe('low');  // urgencyValue
  });

  test('PUT /api/events/:id -> 500 on DB error', async () => {
    const app = buildApp();
    query.mockRejectedValueOnce(new Error('update failed'));

    const res = await request(app)
      .put('/api/events/1')
      .send({
        event_name: 'X',
        event_description: 'Y',
        location: 'Z',
        required_skills: 'a, b',
        urgency: 'HIGH',
        event_date: '2025-02-02',
        start_time: '08:00',
        end_time: '09:00',
        volunteer_needed: 1,
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error updating event');
  });

  // ---------- DELETE /api/events/:id ----------
  test('DELETE /api/events/:id -> 200 on success', async () => {
    const app = buildApp();
    query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete('/api/events/5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Event deleted successfully' });
  });

  test('DELETE /api/events/:id -> 404 when not found', async () => {
    const app = buildApp();
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/api/events/555');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Event not found' });
  });

  test('DELETE /api/events/:id -> 500 on DB error', async () => {
    const app = buildApp();
    query.mockRejectedValueOnce(new Error('delete failed'));

    const res = await request(app).delete('/api/events/2');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete event' });
  });
});
