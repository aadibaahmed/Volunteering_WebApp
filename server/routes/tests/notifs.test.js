import request from "supertest";
import { jest } from "@jest/globals";
import express from "express";

const setupApp = async ({ getNotifsMock, getUserNotifsMock, markReadMock, user }) => {
  await jest.unstable_mockModule("../../notifications/get_notifs.js", () => ({
    getNotifications: getNotifsMock,
    getNotificationsForUser: getUserNotifsMock,
    markNotificationAsRead: markReadMock,
  }));

  await jest.unstable_mockModule("../../middleware/auth.js", () => ({
    requireAuth: (req, res, next) => {
      req.user = user;
      next();
    },
  }));

  const { default: router } = await import("../../routes/notifs.routes.js");

  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
};

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("Notifications API", () => {
  test("GET /api/notifications returns 200 for superuser", async () => {
    const getNotifsMock = jest.fn().mockResolvedValue([
      { id: 1, message: "Mocked message", time: "10 min ago", unread: true },
    ]);

    const app = await setupApp({
      getNotifsMock,
      getUserNotifsMock: jest.fn(),
      markReadMock: jest.fn(),
      user: { role: "superuser", sub: 1 },
    });

    const res = await request(app).get("/api/notifications");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("message", "Mocked message");
    expect(getNotifsMock).toHaveBeenCalled();
  });

  test("GET /api/notifications returns 403 for non-superuser", async () => {
    const getNotifsMock = jest.fn();

    const app = await setupApp({
      getNotifsMock,
      getUserNotifsMock: jest.fn(),
      markReadMock: jest.fn(),
      user: { role: "user", sub: 2 },
    });

    const res = await request(app).get("/api/notifications");

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error", "Access denied");
    expect(getNotifsMock).not.toHaveBeenCalled();
  });

  test("GET /api/notifications handles DB errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const getNotifsMock = jest.fn().mockRejectedValue(new Error("DB error"));

    const app = await setupApp({
      getNotifsMock,
      getUserNotifsMock: jest.fn(),
      markReadMock: jest.fn(),
      user: { role: "superuser", sub: 1 },
    });

    const res = await request(app).get("/api/notifications");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "Failed to fetch notifications");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("GET /api/my-notifications returns user notifications", async () => {
    const userNotifsMock = jest.fn().mockResolvedValue([
      { id: 10, message: "User message", user_id: 2, unread: true },
    ]);

    const app = await setupApp({
      getNotifsMock: jest.fn(),
      getUserNotifsMock: userNotifsMock,
      markReadMock: jest.fn(),
      user: { role: "user", sub: 2 },
    });

    const res = await request(app).get("/api/my-notifications");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("message", "User message");
    expect(userNotifsMock).toHaveBeenCalledWith(2);
  });

  test("PUT /api/:id/read marks notification as read", async () => {
    const markReadMock = jest.fn().mockResolvedValue({ notif_id: 5, user_id: 1 });

    const app = await setupApp({
      getNotifsMock: jest.fn(),
      getUserNotifsMock: jest.fn(),
      markReadMock,
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Notification marked as read");
    expect(markReadMock).toHaveBeenCalledWith(5);
  });

  test("PUT /api/:id/read returns 404 if notification not found", async () => {
    const markReadMock = jest.fn().mockResolvedValue(null);

    const app = await setupApp({
      getNotifsMock: jest.fn(),
      getUserNotifsMock: jest.fn(),
      markReadMock,
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "Notification not found");
  });

  test("PUT /api/:id/read returns 403 if notification belongs to another user", async () => {
    const markReadMock = jest.fn().mockResolvedValue({ notif_id: 5, user_id: 2 });

    const app = await setupApp({
      getNotifsMock: jest.fn(),
      getUserNotifsMock: jest.fn(),
      markReadMock,
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error", "Access denied");
  });
});
