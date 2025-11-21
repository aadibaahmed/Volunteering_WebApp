import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mock Authentication Middleware ---
const mockAuth = jest.fn((req, res, next) => {
  req.user = {
    sub: 2, 
    first_name: "Token", 
    last_name: "User",
  };
  next();
});

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: mockAuth,
}));

const mockQuery = jest.fn();
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: mockQuery },
}));

const { requireAuth } = await import("../../middleware/auth.js");
const { pool } = await import("../../database.js");
const volunteerDashRoutes = (await import("../volunteerDash.routes.js")).default;

const app = express();
app.use(express.json());
app.use("/volunteer-dashboard", volunteerDashRoutes);

describe("Volunteer Dashboard Route", () => {
  let consoleErrorSpy; 

  beforeAll(() => {
    // Spy on console.error to prevent test pollution and check for error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore the original console.error implementation after all tests
    consoleErrorSpy.mockRestore();
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks(); 
    consoleErrorSpy.mockClear(); 
    // Reset mockAuth implementation for tests that need the default token
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { sub: 2, first_name: "Token", last_name: "User" };
      next();
    });
  });

  // Helper function to mock all 6 successful queries in the correct order for Promise.all
  const mockSuccessfulQueries = (
    userId = 2,
    profileNames = { first_name: "John", last_name: "Doe" },
    totalActiveOpportunities = 20 // Default value for Q6
  ) => {
    // 1: profileRes (Q1)
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: userId, ...profileNames, city: "Austin", completed: true }],
    });
    // 2: unreadRes (Q2)
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 5 }] });
    // 3: upcomingRes (Q3) - 1 signed up event
    mockQuery.mockResolvedValueOnce({
      rows: [
        { event_id: 1, name: "Next Event" },
      ],
    });
    // 4: histRes (Q4)
    mockQuery.mockResolvedValueOnce({
      rows: [
        { history_id: 10, event_name: "Recent History", hours_served: 2.5, status: "completed" },
      ],
    });
    // 5: statsRes (Q5) - MOCKING total_hours AS A STRING
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_events: 10, completed_events: 8, total_hours: "15.5" }],
    });
    // 6: activeOpportunitiesRes (Q6) - GLOBAL COUNT
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_active_opportunities: totalActiveOpportunities }],
    });
  };

  test("GET /volunteer-dashboard -> returns valid nested dashboard data (Happy Path) and verifies new counts", async () => {
    mockSuccessfulQueries();

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.profile.first_name).toBe("John");
    
    // Check statistics calculations
    expect(res.body.statistics.totalHours).toBe(15.5); 
    
    // CRITICAL: Check the new dashboardCounts object
    expect(res.body.dashboardCounts.upcomingSignedUp).toBe(1); // Length of upcomingRes.rows (Q3)
    expect(res.body.dashboardCounts.totalActive).toBe(20); // Mocked value for Q6
  });

  test("Handles missing profile data gracefully (Q1 returns empty rows)", async () => {
    // 1: profileRes -> empty
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2-5: The rest of the queries run successfully
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ history_id: 1 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_events: 5, completed_events: 5, total_hours: "10.0" }],
    });
    // 6: activeOpportunitiesRes
    mockQuery.mockResolvedValueOnce({ rows: [{ total_active_opportunities: 50 }] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toBeNull();
    expect(res.body.dashboardCounts.totalActive).toBe(50);
  });
  
  test("Handles zero volunteer stats (Q5 returns empty rows), setting rate to 0", async () => {
    // 1: profileRes
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 2, first_name: "Jane" }] });
    // 2: unreadRes
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 0 }] });
    // 3: upcomingRes (0 upcoming signups)
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    // 4: histRes
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    
    // 5: statsRes returns empty array
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 6: activeOpportunitiesRes
    mockQuery.mockResolvedValueOnce({ rows: [{ total_active_opportunities: 0 }] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.statistics.totalEvents).toBe(0);
    expect(res.body.statistics.totalHours).toBe(0); 
    // Check the new counts are 0
    expect(res.body.dashboardCounts.upcomingSignedUp).toBe(0);
    expect(res.body.dashboardCounts.totalActive).toBe(0); 
  });

  test("Handles partial stats (non-zero total events, zero completed events) for completionRate", async () => {
    // 1: profileRes
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 2, first_name: "Jane" }] });
    // 2: unreadRes
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 0 }] });
    // 3: upcomingRes
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 4: histRes
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    
    // 5: Q5: total_events > 0, completed_events = 0
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_events: 5, completed_events: 0, total_hours: "1.0" }],
    });
    // 6: activeOpportunitiesRes
    mockQuery.mockResolvedValueOnce({ rows: [{ total_active_opportunities: 10 }] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.statistics.completionRate).toBe(0); // 0/5 * 100 = 0
    expect(res.body.dashboardCounts.totalActive).toBe(10);
  });

  test("Handles null total_hours in stats, defaulting to 0", async () => {
    // 1: profileRes
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 2, first_name: "John", last_name: "Doe" }] });
    // 2: unreadRes
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 5 }] });
    // 3: upcomingRes
    mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 1 }] });
    // 4: histRes
    mockQuery.mockResolvedValueOnce({ rows: [{ history_id: 10 }] });

    // 5: statsRes with null hours
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_events: 10, completed_events: 8, total_hours: null }],
    });
    // 6: activeOpportunitiesRes
    mockQuery.mockResolvedValueOnce({ rows: [{ total_active_opportunities: 15 }] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.statistics.totalHours).toBe(0); 
  });


  test("Handles SQL error in Promise.all gracefully (Outer Catch)", async () => {
    // 1: profileRes succeeds
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 2 }] });
    // 2: unreadRes FAILS (Promise.all is rejected)
    mockQuery.mockRejectedValueOnce(new Error("Notification query failed"));
    // 3, 4, 5, 6: The remaining mocks must still be present to fill the mock queue
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    mockQuery.mockResolvedValueOnce({ rows: [] }); 
    mockQuery.mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app).get("/volunteer-dashboard");
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Failed to load volunteer dashboard/i);
    // Assert that the error was logged to the console
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  // 🆕 NEW TEST: Targets Line 108 and 112 for 100% Branch Coverage
  test("Handles empty row set for total active opportunities (Q6) defaulting totalActive to 0", async () => {
    // 1: profileRes
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 2, first_name: "Jane" }] });
    // 2: unreadRes
    mockQuery.mockResolvedValueOnce({ rows: [{ unread: 0 }] });
    // 3: upcomingRes
    mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 1 }] }); 
    // 4: histRes
    mockQuery.mockResolvedValueOnce({ rows: [{ history_id: 1 }] }); 
    // 5: statsRes
    mockQuery.mockResolvedValueOnce({ rows: [{ total_events: 5, completed_events: 5, total_hours: "10.0" }] });
    
    // 6: activeOpportunitiesRes returns an EMPTY rows array (This forces activeOpportunitiesRes.rows[0] to be undefined)
    // This executes the missed branch: activeOpportunitiesRes.rows[0]?.total_active_opportunities ?? 0
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/volunteer-dashboard");

    expect(res.statusCode).toBe(200);
    // Assert that the fallback to 0 occurred (Branch Line 108)
    expect(res.body.dashboardCounts.totalActive).toBe(0); 
    // Ensure the other count is still correct (Branch Line 112 is hit successfully)
    expect(res.body.dashboardCounts.upcomingSignedUp).toBe(1);
  });
});