import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// ---- Mock auth BEFORE importing routes ----
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 123, sub: 123, email: "admin@volunteer.com" };
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
  beforeEach(() => jest.clearAllMocks());

  //POST
  test("POST /api/events -> 400 missing required fields", async () => {
    const res = await request(app).post("/api/events").send({
      event_description: "Missing fields test",
      required_skills: ["Teamwork"],
      urgency: "medium",
      event_date: "2025-11-05",
      start_time: "09:00",
      end_time: "11:00",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
    expect(query).not.toHaveBeenCalled();
  });

  test("POST /api/events -> 201 (string skills + urgency lowercased)", async () => {
    query.mockResolvedValueOnce({
      rows: [{ event_id: 1, name: "Cleaning" }],
    });

    const res = await request(app).post("/api/events").send({
      event_name: "Cleaning",
      event_description: "Clean up park",
      location: "Houston",
      required_skills: "Cleaning, Leadership",
      urgency: "MEDIUM",
      event_date: "2025-11-02",
      start_time: "10:00",
      end_time: "12:00",
    });

    expect(res.status).toBe(201);
    const args = query.mock.calls[0][1];

    expect(args[1]).toBe("Cleaning, Leadership");
    expect(args[4]).toBe("medium");
    expect(args[9]).toBe(123);
  });

  test("POST /api/events -> 201 (array skills)", async () => {
    query.mockResolvedValueOnce({ rows: [{ event_id: 2 }] });

    const res = await request(app).post("/api/events").send({
      event_name: "Food Drive",
      event_description: "Collect donations",
      location: "Houston",
      required_skills: ["Coordination", "Driving"],
      urgency: "low",
      event_date: "2025-12-10",
      start_time: "08:00",
      end_time: "10:00",
    });

    expect(res.status).toBe(201);
    expect(query.mock.calls[0][1][1]).toBe("Coordination, Driving");
  });

  test("POST /api/events -> 500 DB error", async () => {
    query.mockRejectedValueOnce(new Error("DB connection failed"));

    const res = await request(app).post("/api/events").send({
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
  });

  //GET
  test("GET /api/events -> 200 returns array", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 1, eventName: "Cleaning" },
        { id: 2, eventName: "Cooking" },
      ],
    });

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/events -> 500 DB error", async () => {
    query.mockRejectedValueOnce(new Error("Failed to fetch events"));
    const res = await request(app).get("/api/events");

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error fetching/i);
  });

  // GET /:id
  test("GET /api/events/:id -> 200 returns event", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, eventName: "Cleanup", description: "Test event" }],
    });

    const res = await request(app).get("/api/events/1");

    expect(res.status).toBe(200);
    expect(res.body.eventName).toBe("Cleanup");
  });

  test("GET /api/events/:id -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/events/999");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test("GET /api/events/:id -> 500 error", async () => {
    query.mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get("/api/events/1");

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/failed to load/i);
  });

  //PUT /:id
  test("PUT /api/events/:id -> 200 success", async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ event_id: 1, name: "Updated Event" }],
    });

    const res = await request(app)
      .put("/api/events/1")
      .send({
        event_name: "Updated Event",
        event_description: "New desc",
        location: "Dallas",
        required_skills: "Driving, Cooking",
        urgency: "high",
        event_date: "2025-10-01",
        start_time: "09:00",
        end_time: "11:00",
        volunteer_needed: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test("PUT /api/events/:id -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .put("/api/events/999")
      .send({
        event_name: "Does not matter",
        event_description: "desc",
        location: "Houston",
        required_skills: "Cleaning",
        urgency: "low",
        event_date: "2025-10-01",
        start_time: "10:00",
        end_time: "12:00",
        volunteer_needed: 3,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test("PUT /api/events/:id -> 500 DB error", async () => {
    query.mockRejectedValueOnce(new Error("Update failed"));

    const res = await request(app)
      .put("/api/events/1")
      .send({
        event_name: "Test Event",
        event_description: "desc",
        location: "Austin",
        required_skills: "Coordination",
        urgency: "medium",
        event_date: "2025-11-01",
        start_time: "08:00",
        end_time: "10:00",
        volunteer_needed: 2,
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/failed to update/i);
  });

  //PUT /:id/volunteers
  test("PUT /api/events/:id/volunteers -> 200 success", async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ event_id: 1, volunteer_ids: [2, 5, 7] }],
    });

    const res = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: [2, 5, 7] });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test("PUT /api/events/:id/volunteers -> 400 invalid array", async () => {
    const res = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: "nope" });

    expect(res.status).toBe(400);
  });

  test("PUT /api/events/:id/volunteers -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .put("/api/events/999/volunteers")
      .send({ volunteer_ids: [2] });

    expect(res.status).toBe(404);
  });

  test("PUT /api/events/:id/volunteers -> 500 DB failure", async () => {
    query.mockRejectedValueOnce(new Error("DB failure"));

    const res = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: [2] });

    expect(res.status).toBe(500);
  });

  // ======================================================
  // ========================= DELETE =====================
  // ======================================================

  test("DELETE /api/events/:id -> 200 success", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete("/api/events/1");
    expect(res.status).toBe(200);
  });

  test("DELETE /api/events/:id -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete("/api/events/999");
    expect(res.status).toBe(404);
  });

  test("DELETE /api/events/:id -> 500 DB error", async () => {
    query.mockRejectedValueOnce(new Error("Unexpected DB error"));

    const res = await request(app).delete("/api/events/5");
    expect(res.status).toBe(500);
  });

  test("smoke: import routes", async () => {
    const routes = await import("../event.routes.js");
    expect(routes).toBeDefined();
  });
});
