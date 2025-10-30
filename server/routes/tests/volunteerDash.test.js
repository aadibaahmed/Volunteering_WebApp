const request = require('supertest');
import { jest } from '@jest/globals';

// Declare a variable to hold the Express app instance
let app;

// Helper function to dynamically import the server after mocking
// This ensures that our mocks are used when the Express server is initialized.
const importApp = async () => {
    if (!app) {
        // Assuming your main Express application is exported as default from '../../server.js'
        const module = await import('../../server.js');
        app = module.default;
    }
};

beforeEach(() => {
    // Reset modules before each test to ensure a clean, isolated environment.
    jest.resetModules();
    app = null; 
});

describe('Volunteer Dashboard Routes (/api/volunteer-dashboard)', () => {
    // Use a constant mock ID that matches what the route expects from req.user.sub
    const MOCK_VOLUNTEER_ID = 456; 

    // Mock the authentication middleware once for the entire test suite
    beforeAll(async () => {
        await jest.unstable_mockModule("../../middleware/auth.js", () => ({
            requireAuth: (req, res, next) => {
                // This payload simulates a decoded JWT, providing the volunteerId to the route
                req.user = { sub: MOCK_VOLUNTEER_ID, email: 'dash@test.com', role: 'volunteer' };
                next();
            },
        }));
    });

    // Mock responses for the five database queries in the route's Promise.all structure
    const mockDbResponses = {
        // 1. User Profile Query
        user: { rows: [{ first_name: 'Dashboard', last_name: 'Tester' }] },
        // 2. A. Total Hours
        hours: { rows: [{ totalHours: '150.75' }] },
        // 3. B. Completed Events (totalVolunteers)
        completedEvents: { rows: [{ eventsVolunteered: '10' }] },
        // 4. C. All Future Events (activeOpportunities / totalEvents)
        allFutureEvents: { rows: [{ activeOpportunities: '25' }] },
        // 5. D. Pending Signups (pendingApprovals)
        pendingSignups: { rows: [{ pendingApprovals: '3' }] },
    };

    // Test 1: Successful retrieval of all dashboard metrics
    test('should return 200 and all dashboard statistics for the authenticated user', async () => {
        // Mock pool.query to return the expected sequence of results
        const mockQuery = jest.fn()
            .mockResolvedValueOnce(mockDbResponses.user)
            .mockResolvedValueOnce(mockDbResponses.hours)
            .mockResolvedValueOnce(mockDbResponses.completedEvents)
            .mockResolvedValueOnce(mockDbResponses.allFutureEvents)
            .mockResolvedValueOnce(mockDbResponses.pendingSignups);

        await jest.unstable_mockModule("../../database.js", () => ({
            pool: { query: mockQuery },
        }));

        await importApp();
        const res = await request(app).get("/api/volunteer-dashboard"); 

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            firstName: 'Dashboard',
            lastName: 'Tester',
            totalHours: 150.75,
            totalVolunteers: 10,
            totalEvents: 25,
            activeOpportunities: 25,
            pendingApprovals: 3,
        });

        // Verify the database query for Pending Sign-ups was executed with the correct parameters
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('Volunteer_Signups'),
            [MOCK_VOLUNTEER_ID, 'SignedUp']
        );
        expect(mockQuery).toHaveBeenCalledTimes(5); 
    });

    // Test 2: Volunteer not found (404 scenario)
    test('should return 404 if the volunteer profile is not found', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce({ rows: [] }); // User query returns empty

        await jest.unstable_mockModule("../../database.js", () => ({
            pool: { query: mockQuery },
        }));

        await importApp();
        const res = await request(app).get("/api/volunteer-dashboard"); 

        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe('Volunteer profile not found for this user.');
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    // Test 3: Handling database errors (500 scenario)
    test('should return 500 and handle database errors gracefully', async () => {
        const mockError = new Error("Database query failed during metric calculation");
        
        // Mock the initial user query to succeed, but the subsequent metrics query to fail
        const mockQuery = jest.fn()
            .mockResolvedValueOnce(mockDbResponses.user)
            .mockRejectedValue(mockError); // Second query (hours) immediately fails Promise.all

        await jest.unstable_mockModule("../../database.js", () => ({
            pool: { query: mockQuery },
        }));

        // Spy on console.error to prevent test runner failure and verify logging
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        await importApp();
        const res = await request(app).get("/api/volunteer-dashboard");

        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty("error", "Failed to fetch volunteer dashboard data.");
        
        consoleSpy.mockRestore(); 
    });
});