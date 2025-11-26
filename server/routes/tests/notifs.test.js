import request from "supertest";
import { jest } from "@jest/globals";
import express from "express";

const setupApp = async ({ getUserNotifsMock, markReadMock, insertNotifMock, user }) => {
  await jest.unstable_mockModule("../../notifications/get_notifs.js", () => ({
    getNotificationsForUser: getUserNotifsMock,
    markNotificationAsRead: markReadMock,
  }));

  await jest.unstable_mockModule("../../notifications/insert_notifs.js", () => ({
    insert_on_register: insertNotifMock,
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

describe("Notifications API (active routes only)", () => {
  test("GET /api/my-notifications returns user notifications", async () => {
    const getUserNotifsMock = jest.fn().mockResolvedValue([
      { id: 10, message: "User message", user_id: 2, unread: true },
    ]);

    const app = await setupApp({
      getUserNotifsMock,
      markReadMock: jest.fn(),
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 2 },
    });

    const res = await request(app).get("/api/my-notifications");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("message", "User message");
    expect(getUserNotifsMock).toHaveBeenCalledWith(2);
  });

  test("GET /api/my-notifications → 500 on error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const getUserNotifsMock = jest.fn().mockRejectedValue(new Error("uh oh"));

    const app = await setupApp({
      getUserNotifsMock,
      markReadMock: jest.fn(),
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 99 },
    });

    const res = await request(app).get("/api/my-notifications");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch user notifications/i);
    expect(getUserNotifsMock).toHaveBeenCalledWith(99);

    consoleSpy.mockRestore();
  });

  test("PUT /api/:id/read marks notification as read", async () => {
    const markReadMock = jest.fn().mockResolvedValue({ notif_id: 5, user_id: 1 });

    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock,
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/marked as read/i);
    expect(markReadMock).toHaveBeenCalledWith(5);
  });

  test("PUT /api/:id/read → 404 if notification not found", async () => {
    const markReadMock = jest.fn().mockResolvedValue(null);

    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock,
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("PUT /api/:id/read → 403 if notification belongs to another user", async () => {
    const markReadMock = jest.fn().mockResolvedValue({ notif_id: 5, user_id: 999 });

    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock,
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/5/read");

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("PUT /api/:id/read → 400 if ID is not a number", async () => {
    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock: jest.fn(),
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/not-a-number/read");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid notification id/i);
  });

  test("PUT /api/:id/read → 500 if markNotificationAsRead throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const markReadMock = jest.fn().mockRejectedValue(new Error("db explode"));

    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock,
      insertNotifMock: jest.fn(),
      user: { role: "user", sub: 1 },
    });

    const res = await request(app).put("/api/7/read");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/failed to mark notification as read/i);
    expect(markReadMock).toHaveBeenCalledWith(7);

    consoleSpy.mockRestore();
  });

  test("POST /api/insert_notif_on_register creates a notification", async () => {
    const insertNotifMock = jest.fn().mockResolvedValue({
      id: 101,
      user_id: 1,
      message: "Welcome!",
      unread: true,
      type: "welcome",
      priority: "low"
    });

    const app = await setupApp({
      getUserNotifsMock: jest.fn(),
      markReadMock: jest.fn(),
      insertNotifMock,
      user: { role: "user", sub: 1 },
    });

    const res = await request(app)
      .post("/api/insert_notif_on_register")
      .send({ user_id: 1, message: "Welcome!" });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/created successfully/i);
    expect(res.body.notification.message).toBe("Welcome!");
    expect(insertNotifMock).toHaveBeenCalledWith(1, "Welcome!", true, "welcome", "low");
  });
});
