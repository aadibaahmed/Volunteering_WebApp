import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mocking the Role and Auth Middleware ---
// 1. Define a variable to control the role used in tests
let mockRole = 'user'; 

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  // 2. The mock auth now uses the global mockRole and a fixed ID (101 for clarity)
  requireAuth: (req, res, next) => {
    req.user = { sub: 101, role: mockRole }; 
    next();
  },
}));

// --- Mock PostgreSQL Connection Pool ---
const mockQuery = jest.fn();
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: mockQuery },
}));

// --- Import after mocks ---
const { pool } = await import("../../database.js");
const { default: volunteerHistRouter } = await import("../volunteerHist.routes.js");

const app = express();
app.use(express.json());
// Ensure this path matches where the router is mounted in your main app file
app.use("/api/volunteerHist", volunteerHistRouter);

describe("GET /api/volunteerHist", () => {
  let consoleErrorSpy;

  beforeAll(() => {
    // Spy on console.error and suppress its output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore the original console.error implementation
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
    mockRole = 'user'; // Reset to default role before each test
  });

  // --- STANDARD USER TESTS ---

  test("returns volunteer history successfully", async () => {
    const mockHistory = [
      { id: 1, start: "2024-05-01", end: "2024-05-01", role: "Event Helper", organization: "Local Shelter" },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockHistory });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe("Event Helper");
    // Ensure the query uses the user's ID
    expect(pool.query.mock.calls[0][1]).toEqual([101]); 
  });

  test("returns message when no history found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("No volunteer history found.");
  });
  
  // --- SUPERUSER TESTS ---
  
  test("Superuser returns aggregated stats for all volunteers successfully", async () => {
    mockRole = 'superuser';
    const mockSuperuserStats = [
      { volunteerId: 2, volunteerName: "John Doe", totalHours: 10.5, lastActivity: "2024-11-01" },
    ];

    pool.query.mockResolvedValueOnce({ rows: mockSuperuserStats });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].volunteerName).toBe("John Doe");
    // Ensure query has no parameters (it's the massive superuser query)
    expect(pool.query.mock.calls[0][1]).toBeUndefined(); 
  });
  
  test("Superuser returns empty array if no active volunteers are found", async () => {
    mockRole = 'superuser';
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  // --- ERROR HANDLING TEST ---

  test("handles database errors gracefully", async () => {
    const mockError = new Error("DB Error");
    pool.query.mockRejectedValueOnce(mockError);

    const res = await request(app).get("/api/volunteerHist");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to fetch volunteer history");
    // Assert that the error was logged to the console
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching volunteer history:", mockError);
  });
});