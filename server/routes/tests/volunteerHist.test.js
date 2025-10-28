import request from "supertest";
import { jest } from "@jest/globals";

// Declare a variable to hold the Express app instance
let app;

// Helper function to dynamically import the server after mocking
const importApp = async () => {
  // We must import the server inside a test function (or helper called by it)
  // AFTER we mock the database to ensure the mock is used for that specific test run.
  if (!app) {
    const module = await import("../../server.js");
    app = module.default;
  }
};

beforeEach(() => {
  // Resetting modules is essential when using jest.unstable_mockModule
  // to ensure a fresh, un-cached version of 'server.js' is loaded for each test.
  jest.resetModules();
  app = null; // Ensure the app is re-imported after reset
});

describe("Volunteer History Routes (/api/volunteer-history)", () => {

  // Test 1: Successful fetch for a specific ID
  test("should return 200 and an array of volunteer history records for a specific ID", async () => {
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
      // Must mock all exports used by server.js, even if they aren't 'pool'
      query: jest.fn(), 
    }));

    await importApp();
    const res = await request(app).get("/api/volunteer-history?volunteer_id=1");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("role", "Helper");
    expect(res.body.length).toBe(1);
  });

  // Test 2: No records found for a specific ID
  test("should return 200 and a 'no history found' message when query returns empty rows", async () => {
    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      },
      query: jest.fn(),
    }));

    await importApp();
    const res = await request(app).get("/api/volunteer-history?volunteer_id=999");

    // We assume the API returns status 200 with a descriptive message
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "No volunteer history found." });
  });

  // Test 3: Handling database errors
  test("should return 500 and handle database errors gracefully", async () => {
    const mockError = new Error("Database connection failed");

    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockRejectedValue(mockError),
      },
      query: jest.fn(),
    }));

    // Spy on console.error to ensure the error is logged and suppress actual console output
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    await importApp();
    // Test without a volunteer_id, relying on the mock to throw the error
    const res = await request(app).get("/api/volunteer-history");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "Failed to fetch volunteer history");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching volunteer history:",
      mockError
    );

    consoleSpy.mockRestore(); // Clean up the spy
  });

  // Test 4: Request without volunteer_id (fetches all history)
  test("GET /api/volunteer-history without volunteer_id should return all history", async () => {
    // Mocking to return multiple records for 'all history'
    await jest.unstable_mockModule("../../database.js", () => ({
      pool: {
        query: jest.fn().mockResolvedValue({
          rows: [
            { id: 1, role: "A" },
            { id: 2, role: "B" },
          ],
        }),
      },
      query: jest.fn(),
    }));
    
    await importApp();
    const res = await request(app).get("/api/volunteer-history");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});
