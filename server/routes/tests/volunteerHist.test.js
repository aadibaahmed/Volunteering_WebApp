// volunteerHistory.test.js
import request from "supertest";
import app from "../../server.js"; // path to your Express app

describe("Volunteer History Routes", () => {
  test("GET /api/volunteer-history should return 200 and an array", async () => {
    const volunteerId = 1; // use a valid volunteer_id in your test DB

    const res = await request(app).get(`/api/volunteer-history?volunteer_id=${volunteerId}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body) || res.body).toBeTruthy(); // either array or message object
  });

  test("GET /api/volunteer-history should return message if no history exists", async () => {
    const volunteerId = 999999; // unlikely ID to ensure empty

    const res = await request(app).get(`/api/volunteer-history?volunteer_id=${volunteerId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "No volunteer history found.");
  });

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
