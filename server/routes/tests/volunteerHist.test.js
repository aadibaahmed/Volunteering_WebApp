// routes/tests/volunteerHist.test.js
import request from "supertest";
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

describe("GET /api/volunteer-history", () => {
  test("should return 200 and an array of volunteer history records", async () => {
    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockResolvedValue({
          rows: [
            {
              id: 1,
              start: "2025-01-01",
              end: "2025-01-02",
              role: "Helper",
              organization: "Test Org",
            },
          ],
        }),
      },
      query: jest.fn(), // 👈 added so server.js import doesn't break
    }));

    const { default: app } = await import("../../server.js");
    const res = await request(app).get("/api/volunteer-history?volunteer_id=1");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("role", "Helper");
  });

  test("should return message when no volunteer history found", async () => {
    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      },
      query: jest.fn(),
    }))
});

    const { default: app } = await import("../../server.js");
    const res = await request(app).get("/api/volunteer-history?volunteer_id=999");

describe("Volunteer History Routes", () => {
  test("GET /api/volunteer-history should return 200 and an array", async () => {
    const volunteerId = 1; // use a valid volunteer_id in your test DB

    const res = await request(app).get(`/api/volunteer-history?volunteer_id=${volunteerId}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body) || res.body).toBeTruthy(); // either array or message object
  })
});

  test("GET /api/volunteer-history should return message if no history exists", async () => {
    const volunteerId = 999999; // unlikely ID to ensure empty

    const res = await request(app).get(`/api/volunteer-history?volunteer_id=${volunteerId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "No volunteer history found.");
  });

  test("should handle database errors gracefully", async () => {
    const mockError = new Error("Database connection failed");

    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockRejectedValue(mockError),
      },
      query: jest.fn(),
    }));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { default: app } = await import("../../server.js");
    const res = await request(app).get("/api/volunteer-history");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "Failed to fetch volunteer history");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching volunteer history:",
      mockError
    );

    consoleSpy.mockRestore();
  test("GET /api/volunteer-history without volunteer_id should return all history", async () => {
    const res = await request(app).get("/api/volunteer-history");

    expect(res.statusCode).toBe(200);
    // Can be array or object with message if DB is empty
    expect(Array.isArray(res.body) || res.body).toBeTruthy();
  });

  test("GET /api/volunteer-history should handle invalid volunteer_id gracefully", async () => {
    const volunteerId = "invalid"; // non-numeric string

    const res = await request(app).get(`/api/volunteer-history?volunteer_id=${volunteerId}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body) || res.body).toBeTruthy();
  });
});
