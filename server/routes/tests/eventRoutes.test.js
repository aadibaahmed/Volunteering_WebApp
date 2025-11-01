import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 1, sub: 1, email: "admin@volunteer.com", role: "superuser" };
    next();
  }
}));


jest.unstable_mockModule("../../database.js", () => ({
  query: jest.fn()
}));

const { query } = await import("../../database.js");
const eventRoutes = (await import("../event.routes.js")).default || (await import("../event.routes.js"));

const app = express();
app.use(express.json());
app.use("/api/events", eventRoutes);

describe("Event Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  test("POST /api/events should create a new event", async () => {
    query.mockResolvedValueOnce({
      rows: [{
        event_id: 1,
        event_name: "Cleaning",
        event_description: "Clean up park",
        location: "Houston"
      }]
    });

    const response = await request(app)
      .post("/api/events")
      .send({
        event_name: "Cleaning",
        event_description: "Clean up park",
        location: "Houston",
        required_skills: ["Cleaning"],
        urgency: "medium",
        event_date: "2025-11-02",
        start_time: "10:00",
        end_time: "12:00"
      });

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
        end_time: "11:00"
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


  test("should import event.routes.js without crashing", async () => {
    const routes = await import("../event.routes.js");
    expect(routes).toBeDefined();
  });
});
