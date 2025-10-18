// routes/tests/allevents.test.js
import request from "supertest";
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

describe("GET /api/events/allevents", () => {
  test("should return 200 and an array of events", async () => {
    await jest.unstable_mockModule("../../events/all_events.js", () => ({
      getAllEvents: jest.fn().mockResolvedValue([
        { name: "Tree Planting" },
        { name: "Beach Cleanup" },
      ]),
    }));

    const { default: app } = await import("../../server.js");
    const res = await request(app).get("/api/allevents");


    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("should handle server errors gracefully", async () => {
    await jest.unstable_mockModule("../../events/all_events.js", () => ({
      getAllEvents: jest.fn().mockRejectedValue(new Error("Database error")),
    }));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { default: app } = await import("../../server.js");
    const res = await request(app).get("/api/allevents");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "Error fetching events");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
