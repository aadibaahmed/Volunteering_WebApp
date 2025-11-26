import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

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

  beforeEach(() => {
    jest.clearAllMocks();
  });


  test("POST /api/events -> 400 when missing required fields", async () => {
    const res = await request(app).post("/api/events").send({
      event_description: "Test",
      required_skills: ["Teamwork"],
      urgency: "medium",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
    expect(query).not.toHaveBeenCalled();
  });

  test("POST /api/events -> 201 success (string skills + lowercase urgency)", async () => {
    query.mockResolvedValueOnce({ rows: [{ event_id: 1, name: "Cleaning" }] });

    const res = await request(app).post("/api/events").send({
      event_name: "Cleaning",
      event_description: "Clean park",
      location: "Houston",
      required_skills: "Cleaning, Leadership",
      urgency: "MEDIUM",
      event_date: "2025-11-02",
      start_time: "10:00",
      end_time: "12:00",
      volunteer_needed: 3
    });

    expect(res.status).toBe(201);

    const args = query.mock.calls[0][1];
    expect(args[1]).toBe("Cleaning, Leadership");  // skills
    expect(args[4]).toBe("medium");               // urgency
    expect(args[9]).toBe(123);                    // manager id
  });

  test("POST /api/events -> 500 on DB error", async () => {
    query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).post("/api/events").send({
      event_name: "Test",
      event_description: "Desc",
      location: "TX",
      required_skills: ["Cleaning"],
      urgency: "low",
      event_date: "2025-11-03",
      start_time: "08:00",
      end_time: "10:00",
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error creating/i);
  });


  test("GET /api/events -> 200 returns events", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, eventName: "Cleanup" }]
    });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/events -> 500 db error", async () => {
    query.mockRejectedValueOnce(new Error("Error"));

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error fetching/i);
  });

  
  test("GET /api/events/:id -> 200 success", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, eventName: "Cleanup" }]
    });

    const res = await request(app).get("/api/events/1");

    expect(res.status).toBe(200);
    expect(res.body.eventName).toBe("Cleanup");
  });

  test("GET /api/events/:id -> 404 not found", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/events/99");

    expect(res.status).toBe(404);
  });

  test("GET /api/events/:id -> 500 db error", async () => {
    query.mockRejectedValueOnce(new Error());

    const res = await request(app).get("/api/events/1");

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/failed to load/i);
  });

  test("PUT /api/events/:id -> 200 success", async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ event_id: 1 }]
    });

    const res = await request(app).put("/api/events/1").send({
      event_name: "Updated",
      event_description: "Updated desc",
      location: "Austin",
      required_skills: "Driving",
      urgency: "high",
      event_date: "2025-11-05",
      start_time: "10:00",
      end_time: "12:00",
      volunteer_needed: 2,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test("PUT /api/events/:id -> 404", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).put("/api/events/99").send({
      event_name: "Test",
      event_description: "Desc",
      location: "TX",
      required_skills: "Driving",
      urgency: "low",
      event_date: "2025-11-05",
      start_time: "10:00",
      end_time: "12:00",
      volunteer_needed: 1,
    });

    expect(res.status).toBe(404);
  });

  test("PUT /api/events/:id -> 500", async () => {
    query.mockRejectedValueOnce(new Error());

    const res = await request(app).put("/api/events/1").send({
      event_name: "Test",
      event_description: "Desc",
      location: "TX",
      required_skills: "Driving",
      urgency: "low",
      event_date: "2025-11-05",
      start_time: "10:00",
      end_time: "12:00",
    });

    expect(res.status).toBe(500);
  });

 
  test("PUT /api/events/:id/volunteers -> 200", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: [1, 2, 3] });

    expect(res.status).toBe(200);
  });

  test("PUT /api/events/:id/volunteers -> 400", async () => {
    const res = await request(app)
      .put("/api/events/1/volunteers")
      .send({ volunteer_ids: "wrong" });

    expect(res.status).toBe(400);
  });

  
  test("DELETE /api/events/:id -> 200", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete("/api/events/1");
    expect(res.status).toBe(200);
  });

  test("DELETE /api/events/:id -> 404", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete("/api/events/99");
    expect(res.status).toBe(404);
  });


  test("POST /api/events/signup/:id -> 201 success", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ signup_id: 1 }] });

    const res = await request(app).post("/api/events/signup/1");

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/successfully/i);
  });

  test("POST /api/events/signup/:id -> 409 already signed up", async () => {
    query.mockResolvedValueOnce({ rows: [{ signup_id: 1 }] });

    const res = await request(app).post("/api/events/signup/1");

    expect(res.status).toBe(409);
  });

});
