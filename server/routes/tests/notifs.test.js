import request from "supertest";
import { jest } from "@jest/globals";

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("GET /api/notifications", () => {
  test("should return 200 and an array of notifications", async () => {
    jest.unstable_mockModule("../../notifications/get_notifs.js", () => ({
      getNotifications: jest.fn().mockReturnValue([
        { id: 1, message: "Mocked message", time: "10 min ago", unread: true },
      ]),
    }));

    const { default: app } = await import("../../server.js");

    const res = await request(app).get("/api/notifications");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("message", "Mocked message");
  });

  test("should handle empty notifications array", async () => {
    jest.unstable_mockModule("../../notifications/get_notifs.js", () => ({
      getNotifications: jest.fn().mockReturnValue([]),
    }));

    const { default: app } = await import("../../server.js");

    const res = await request(app).get("/api/notifications");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
