import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { sub: 1, email: "admin@volunteer.com", role: "superuser" };
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
  
  test("DELETE /api/events/:id should delete an event", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
  
    const response = await request(app).delete("/api/events/1");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Event deleted successfully");
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
    expect(response.body.error).toMatch(/failed/i);
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

  test("should handle DELETE /api/events/:id when event not found", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
  
    const response = await request(app).delete("/api/events/999");
    expect(response.status).toBe(404);
    expect(response.body.error || response.body.message).toMatch(/not found/i);
  });
  
  test("should handle unexpected errors in DELETE /api/events/:id", async () => {
    query.mockRejectedValueOnce(new Error("Unexpected DB error"));
  
    const response = await request(app).delete("/api/events/5");
  
    expect(response.status).toBe(500);
    expect(response.body.error || response.body.message).toMatch(/failed/i);
  });

  test("should handle errors gracefully in GET /api/events", async () => {
    query.mockRejectedValueOnce(new Error("Failed to fetch events"));
  
    const response = await request(app).get("/api/events");
  
    expect(response.status).toBe(500);
    expect(response.body.error || response.body.message).toMatch(/error fetching/i);
  });

  test("should import event.routes.js without crashing", async () => {
    const routes = await import("../event.routes.js");
    expect(routes).toBeDefined();
  });
});
