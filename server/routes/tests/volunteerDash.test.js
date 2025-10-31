import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mock Authentication Middleware ---
const mockAuth = jest.fn((req, res, next) => {
  // Simulate logged-in volunteer user with names from token
  req.user = {
    sub: 2,
    first_name: "Token", // Using "Token" and "User" to clearly test fallbacks
    last_name: "User",
  };
  next();
});

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: mockAuth,
}));

// --- Mock PostgreSQL Connection Pool ---
const mockQuery = jest.fn();
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: mockQuery },
}));

// --- Import after mocks ---
const { requireAuth } = await import("../../middleware/auth.js");
const { pool } = await import("../../database.js");
const volunteerDashRoutes = (await import("../volunteerDash.routes.js")).default;

// --- Setup Express Test App ---
const app = express();
app.use(express.json());
app.use("/volunteer-dashboard", volunteerDashRoutes);

describe("Volunteer Dashboard Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSuccessfulStats = () => {
    // Query 3a: Total hours
    mockQuery.mockResolvedValueOnce({ rows: [{ totalHours: "10" }] });
    // Query 3b: Completed events
    mockQuery.mockResolvedValueOnce({ rows: [{ eventsVolunteered: "2" }] });
    // Query 3c: Pending approvals
    mockQuery.mockResolvedValueOnce({ rows: [{ pendingApprovals: "1" }] });
    // Query 3d: Upcoming events for user
    mockQuery.mockResolvedValueOnce({ rows: [{ upcoming: "3" }] });
  };

  test("GET /volunteer-dashboard → returns valid dashboard data (Happy Path)", async () => {
    // Mock the sequence of queries used in your route
    mockQuery
      // Query 1: Active opportunities
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "4" }] })
      // Query 2: User profile
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "John", last_name: "Doe" }],
      });
    
    mockSuccessfulStats();

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      firstName: "John", // Name from DB profile
      lastName: "Doe",   // Name from DB profile
      totalHours: 10,
      totalVolunteers: 2,
      totalEvents: 3,
      activeOpportunities: 4,
      pendingApprovals: 1,
    });
  });

  // Test 2: Handles empty rows for active opportunities query (L18 branch)
  test("handles empty rows for active opportunities query, defaulting to 0", async () => {
    mockQuery
      // Query 1: Active opportunities returns empty array
      .mockResolvedValueOnce({ rows: [] })
      // Query 2: User profile
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "Jane", last_name: "Smith" }],
      });
    
    mockSuccessfulStats();

    const res = await request(app).get("/volunteer-dashboard");
    
    expect(res.statusCode).toBe(200);
    expect(res.body.activeOpportunities).toBe(0); // Should default to 0
    expect(res.body.firstName).toBe("Jane");
  });

  // --- NEW TEST: Handles null value for active opportunities (Covers L24 || "0" branch) ---
  test("handles null value for active opportunities, defaulting to 0", async () => {
    mockQuery
      // Query 1: Active opportunities returns a row but null value
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: null }] })
      // Query 2: User profile
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "Jane", last_name: "Smith" }],
      });
    
    mockSuccessfulStats();

    const res = await request(app).get("/volunteer-dashboard");
    
    expect(res.statusCode).toBe(200);
    expect(res.body.activeOpportunities).toBe(0);
  });
  
  // Test 4: Handles SQL error on active opportunities gracefully (L27 inner catch)
  test("handles SQL error on active opportunities gracefully", async () => {
    mockQuery
      // Query 1 fails (Covers inner catch block, including line 27)
      .mockRejectedValueOnce(new Error("active opportunities failed"))
      // Query 2 (profile)
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "John", last_name: "Doe" }],
      });
      
    mockQuery
      .mockResolvedValueOnce({ rows: [{ totalHours: "5" }] })
      .mockResolvedValueOnce({ rows: [{ eventsVolunteered: "1" }] })
      .mockResolvedValueOnce({ rows: [{ pendingApprovals: "0" }] })
      .mockResolvedValueOnce({ rows: [{ upcoming: "2" }] });

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(200);
    expect(res.body.activeOpportunities).toBe(0);
    expect(res.body.totalHours).toBe(5);
  });


  // Test 5: Uses default names if token payload names are missing (L9-10 branches)
  test("uses default names if token payload names are missing", async () => {
    // 1. Mock requireAuth to provide a token with missing names
    requireAuth.mockImplementationOnce((req, res, next) => {
      req.user = {
        sub: 3,
        first_name: null, // Test token fallback on line 9
        last_name: undefined, // Test token fallback on line 10
      };
      next();
    });

    // 2. Mock DB to return minimal data
    mockQuery
      // Query 1: Active opportunities
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "5" }] })
      // Query 2: User profile (user not found, keeps logic simple)
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    // Should fall back to defaults set in volunteerDash.routes.js: "Volunteer" and "User"
    expect(res.body.firstName).toBe("Volunteer");
    expect(res.body.lastName).toBe("User");
    expect(res.body.activeOpportunities).toBe(5);
  });
  
  // Test 6: Falls back to token names if DB profile names are NULL (L46-47 branches)
  test("falls back to token names if user profile names are null in DB", async () => {
    mockQuery
      // Query 1: Active opportunities
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "1" }] })
      // Query 2: User profile (names are NULL/undefined)
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: null, last_name: null }],
      });
      
    mockSuccessfulStats();

    const res = await request(app).get("/volunteer-dashboard");
    
    // The user token provides "Token User", which should be used
    expect(res.statusCode).toBe(200);
    expect(res.body.firstName).toBe("Token"); 
    expect(res.body.lastName).toBe("User");
  });

  // Test 7: Handles missing user profile gracefully (L43 if (profile) branch)
  test("handles missing user profile gracefully (Covers branch where if (profile) is false)", async () => {
    mockQuery
      // Query 1: Active opportunities
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "2" }] })
      // Query 2: User not found
      .mockResolvedValueOnce({ rows: [] });

    // Note: The stats queries (3a-3d) are NOT called because the profile check fails.
    
    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    // Names should fall back to token names (Token User)
    expect(res.body.firstName).toBe("Token"); 
    expect(res.body.lastName).toBe("User");
    // All personal stats should be 0 since if (profile) was false
    expect(res.body.totalHours).toBe(0); 
    expect(res.body.totalVolunteers).toBe(0);
    expect(res.body.activeOpportunities).toBe(2);
  });

  // --- NEW TEST: Test personal stats fallbacks (Covers L60-63 || "0" branches) ---
  test("handles null values for personal stats, defaulting to 0/0.0", async () => {
    mockQuery
      // Query 1: Active opportunities
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "1" }] })
      // Query 2: User profile
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "Jane", last_name: "Smith" }],
      })
      // Query 3a: Total hours returns null
      .mockResolvedValueOnce({ rows: [{ totalHours: null }] })
      // Query 3b: Completed events returns null
      .mockResolvedValueOnce({ rows: [{ eventsVolunteered: null }] })
      // Query 3c: Pending approvals returns null
      .mockResolvedValueOnce({ rows: [{ pendingApprovals: null }] })
      // Query 3d: Upcoming events for user returns null
      .mockResolvedValueOnce({ rows: [{ upcoming: null }] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.totalHours).toBe(0);
    expect(res.body.totalVolunteers).toBe(0);
    expect(res.body.pendingApprovals).toBe(0);
    expect(res.body.totalEvents).toBe(0);
  });
  
  // Test 9: Handles fatal error if profile query fails (L71-74 catch path)
  test("handles fatal error if profile query fails", async () => {
    mockQuery
      // Query 1: Active opportunities succeeds
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "1" }] })
      // Query 2: User profile FAILS -> Triggers outer catch
      .mockRejectedValueOnce(new Error("Profile query failed"));

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/critical server error/i);
  });

  // Test 10: Handles full SQL failure gracefully (Q3 failure) (L71-74 catch path)
  test("handles full SQL failure gracefully (fatal error, Q3 failure)", async () => {
    mockQuery
      // Query 1: Active opportunities succeeds
      .mockResolvedValueOnce({ rows: [{ activeOpportunities: "1" }] })
      // Query 2: User profile succeeds
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, first_name: "John", last_name: "Doe" }],
      })
      // Query 3a: Total hours fails -> This will reject the Promise.all and trigger the outer catch
      .mockRejectedValueOnce(new Error("Stats query failed"));

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/critical server error/i);
  });

  // Test 11: Handles full SQL failure gracefully (Q1 failure) (L71-74 catch path)
  test("handles full SQL failure gracefully (fatal error, Q1 failure)", async () => {
    // Q1 fails immediately -> triggers the outer catch (lines 71-74) before the inner catch is reached
    mockQuery.mockRejectedValue(new Error("database unavailable on Q1"));

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/critical server error/i);
  });

  test("returns 401 if requireAuth denies access", async () => {
    requireAuth.mockImplementationOnce((req, res, next) =>
      res.status(401).json({ error: "unauthorized" })
    );

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/unauthorized/i);
  });
});
