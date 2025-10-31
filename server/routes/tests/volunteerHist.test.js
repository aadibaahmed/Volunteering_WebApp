import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// 🧠 1️⃣ Mock first — before importing the router
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: jest.fn() },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { sub: 1 };
    next();
  },
}));

// 🧠 2️⃣ Now import the mocked modules
const { pool } = await import("../../database.js");
const { default: volunteerHistRouter } = await import("../volunteerHist.routes.js");

const app = express();
app.use(express.json());
app.use("/api/volunteerHist", volunteerHistRouter);

describe("GET /api/volunteerHist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns volunteer history successfully", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          start: "2024-05-01",
          end: "2024-05-01",
          role: "Event Helper",
          organization: "Local Shelter",
        },
      ],
    });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe("Event Helper");
  });

  test("returns message when no history found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("No volunteer history found.");
  });

  test("handles database errors gracefully", async () => {
    pool.query.mockRejectedValueOnce(new Error("DB Error"));

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to fetch volunteer history");
  });
});
