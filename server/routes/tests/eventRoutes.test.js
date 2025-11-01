import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// ---- Mocks (must be before imports) ----
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 123, sub: 1, email: "admin@volunteer.com", role: "superuser" };
  requireAuth: (req, res, next) => {
    req.user = { id: 1, sub: 1, email: "admin@volunteer.com", role: "superuser" };
    next();
  },
}));


jest.unstable_mockModule("../../database.js", () => ({
  query: jest.fn(),
}));

const { query } = await import("../../database.js");
const eventRoutesModule = await import("../event.routes.js");
const eventRoutes = eventRoutesModule.default || eventRoutesModule;

const app = express();
app.use(express.json());
app.use("/api/events", eventRoutes);

describe("Event Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- POST ----------
  test("POST /api/events -> 400 when required fields missing", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({
        event_description: "Missing fields test",
        required_skills: ["Teamwork"],
        urgency: "medium",
        event_date: "2025-11-05",
        start_time: "09:00",
        end_time: "11:00",
      });

    expect(res.status).toBe(400);
    expect(res.body.error || res.body.message).toMatch(/missing/i);
    expect(query).not.toHaveBeenCalled();
  });

  test("POST /api/events -> 201 (skills as string, urgency lowercased, manager id from auth)", async () => {
    const row = {
      event_id: 1,
      name: "Cleaning",
      required_skills: "Cleaning, Leadership",
      event_description: "Clean up park",
      location: "Houston",
      urgency: "medium",
      event_date: "2025-11-02",
      time_start: "10:00",
      time_end: "12:00",
      volunteer_needed: 0,
      manager_user_id: 123,
    };
    query.mockResolvedValueOnce({ rows: [row] });

  test("POST /api/events should create a new event", async () => {
    query.mockResolvedValueOnce({
      rows: [{
        event_id: 1,
        event_name: "Cleaning",
        event_description: "Clean up park",
        location: "Houston"
      }]
    });

    const res = await request(app)
      .post("/api/events")
      .send({
        event_name: "Cleaning",
        event_description: "Clean up park",
        location: "Houston",
        required_skills: "Cleaning, Leadership",   // string branch
        urgency: "MEDIUM",                         // should be lowercased
        event_date: "2025-11-02",
        start_time: "10:00",
        end_time: "12:00",
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/created/i);
    expect(res.body.event).toBeTruthy();

    // verify INSERT args (urgency lowercased, manager id passed)
    const args = query.mock.calls[0][1];
    expect(args[4]).toBe("medium"); // urgencyValue
    expect(args[9]).toBe(123);      // manager_user_id from req.user.id
  });

  test("POST /api/events -> 201 (skills as array)", async () => {
    query.mockResolvedValueOnce({ rows: [{ event_id: 2 }] });

    const res = await request(app)
      .post("/api/events")
      .send({
        event_name: "Food Drive",
        event_description: "Collect donations",
        location: "Houston",
        required_skills: ["Coordination", "Driving"], // array branch
        urgency: "low",
        event_date: "2025-12-10",
        start_time: "08:00",
        end_time: "10:00",
      });

    expect(res.status).toBe(201);
    const args = query.mock.calls[0][1];
    expect(args[1]).toBe("Coordination, Driving"); // joined properly
  });

  test("POST /api/events -> 500 on DB error", async () => {
    query.mockRejectedValueOnce(new Error("DB connection failed"));

    const res = await request(app)
    expect(response.status).toBe(201);
    expect(response.body.event).toBeDefined();
  });

  test("POST /api/events should return 400 if required fields are missing", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({
        event_description: "Missing fields test",
        required_skills: ["Teamwork"],
        urgency: "medium",
        event_date: "2025-11-05",
        start_time: "09:00",
        end_time: "11:00"
      });

    expect(response.status).toBe(400);
    expect(response.body.error || response.body.message).toMatch(/missing/i);
  });

 
  test("POST /api/events should handle database errors gracefully", async () => {
    query.mockRejectedValueOnce(new Error("DB connection failed"));

    const response = await request(app)
      .post("/api/events")
      .send({
        event_name: "Beach Cleanup",
        event_description: "Cleanup event",
        location: "Miami",
        required_skills: ["Cleaning"],
        urgency: "medium",
        event_date: "2025-11-03",
        start_time: "08:00",
        end_time: "11:00",
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error creating/i);
    expect(res.body.error).toMatch(/db connection failed/i);
  });

  // ---------- GET ----------
  test("GET /api/events -> 200 returns array", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 1, eventName: "Cleaning", urgency: "medium" },
        { id: 2, eventName: "Cooking", urgency: "high" },
      ],
    });

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test("GET /api/events -> 500 on DB error", async () => {
    query.mockRejectedValueOnce(new Error("Failed to fetch events"));
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error fetching/i);
  });

  // ---------- PUT ----------
  test("PUT /api/events/:id -> 400 when required fields missing", async () => {
    const res = await request(app)
      .put("/api/events/99")
      .send({ urgency: "high" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
    expect(query).not.toHaveBeenCalled();
  });

  test("PUT /api/events/:id -> 404 when event not found", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put("/api/events/999")
      .send({
        event_name: "Updated",
        event_description: "desc",
        location: "HOU",
        required_skills: "x, y",
        urgency: "MEDIUM",
        event_date: "2025-02-02",
        start_time: "08:00",
        end_time: "09:00",
        volunteer_needed: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("PUT /api/events/:id -> 200 success (array skills, default urgency low)", async () => {
    const updated = {
      event_id: 7,
      name: "Updated",
      required_skills: "x, y",
      event_description: "desc",
      location: "HOU",
      urgency: "low",
      event_date: "2025-02-02",
      time_start: "08:00",
      time_end: "09:00",
      volunteer_needed: 1,
    };
    query.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/events/7")
      .send({
        event_name: "Updated",
        event_description: "desc",
        location: "HOU",
        required_skills: ["x", "y"], // array branch
        // urgency omitted -> default 'low'
        event_date: "2025-02-02",
        start_time: "08:00",
        end_time: "09:00",
        volunteer_needed: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);

    const args = query.mock.calls[0][1];
    expect(args[1]).toBe("x, y"); // joined skills
    expect(args[4]).toBe("low");  // default urgency
  });

  test("PUT /api/events/:id -> 500 on DB error", async () => {
    query.mockRejectedValueOnce(new Error("update failed"));

    const res = await request(app)
      .put("/api/events/1")
      .send({
        event_name: "X",
        event_description: "Y",
        location: "Z",
        required_skills: "a, b",
        urgency: "HIGH",
        event_date: "2025-02-02",
        start_time: "08:00",
        end_time: "09:00",
        volunteer_needed: 1,
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error updating/i);
  });

  // ---------- DELETE ----------
  test("DELETE /api/events/:id -> 200 on success", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete("/api/events/1");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Event deleted successfully");
  });

  test("DELETE /api/events/:id -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete("/api/events/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("DELETE /api/events/:id -> 500 on DB error", async () => {
    query.mockRejectedValueOnce(new Error("Unexpected DB error"));
    const res = await request(app).delete("/api/events/5");
    expect(res.status).toBe(500);
    expect(res.body.error || res.body.message).toMatch(/failed/i);
  });
    expect(response.status).toBe(500);
    expect(response.body.message).toMatch(/error creating/i);
  });

  test("GET /api/events should fetch all events", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { event_id: 1, event_name: "Cleaning", urgency: "medium" },
        { event_id: 2, event_name: "Cooking", urgency: "high" }
      ]
    });

    const response = await request(app).get("/api/events");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  test("GET /api/events should handle errors gracefully", async () => {
    query.mockRejectedValueOnce(new Error("Failed to fetch events"));
    const response = await request(app).get("/api/events");
    expect(response.status).toBe(500);
    expect(response.body.message).toMatch(/error fetching/i);
  });

  test("PUT /api/events/:id/volunteers should update volunteer list successfully", async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ event_id: 1, volunteer_ids: [2, 5, 7] }]
    });

    const response = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: [2, 5, 7] });

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/updated successfully/i);
  });

  test("PUT /api/events/:id/volunteers should return 400 if volunteer_ids is not an array", async () => {
    const response = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: "not-array" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/must be an array/i);
  });

  test("PUT /api/events/:id/volunteers should return 404 if event not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app)
      .put("/api/events/999/volunteers")
      .send({ volunteer_ids: [2] });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/not found/i);
  });

  test("PUT /api/events/:id/volunteers should handle DB errors gracefully", async () => {
    query.mockRejectedValueOnce(new Error("DB failure"));

    const response = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: [2] });

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/failed/i);
  });


  test("DELETE /api/events/:id should delete an event", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).delete("/api/events/1");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Event deleted successfully");
  });

  test("DELETE /api/events/:id should handle not found event", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
    const response = await request(app).delete("/api/events/999");
    expect(response.status).toBe(404);
  });

  test("DELETE /api/events/:id should handle unexpected errors", async () => {
    query.mockRejectedValueOnce(new Error("Unexpected DB error"));
    const response = await request(app).delete("/api/events/5");
    expect(response.status).toBe(500);
  });


  test("smoke: event.routes.js imports", async () => {
    const routes = await import("../event.routes.js");
    expect(routes).toBeDefined();
  });
});
