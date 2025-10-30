import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
});

const setupAppWithMocks = async ({ allEventsMock, eventByIdMock }) => {
  await jest.unstable_mockModule("../../events/all_events.js", () => ({
    getAllEvents: allEventsMock,
  }));

  await jest.unstable_mockModule("../../events/event_by_id.js", () => ({
    event_by_id: eventByIdMock,
  }));

  const router = (await import("../allevents.routes.js")).default;

  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
};

describe("Events API (DB queries)", () => {
  test("GET /api/allevents returns events from DB", async () => {
    const app = await setupAppWithMocks({
      allEventsMock: jest.fn().mockResolvedValue([
        { id: 1, name: "Tree Planting" },
        { id: 2, name: "Beach Cleanup" },
      ]),
      eventByIdMock: jest.fn(),
    });

    const res = await request(app).get("/api/allevents");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("name", "Tree Planting");
  });

  test("GET /api/allevents handles DB errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const app = await setupAppWithMocks({
      allEventsMock: jest.fn().mockRejectedValue(new Error("DB error")),
      eventByIdMock: jest.fn(),
    });

    const res = await request(app).get("/api/allevents");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "Error fetching events");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("GET /api/events/:id returns event details", async () => {
    const app = await setupAppWithMocks({
      allEventsMock: jest.fn(),
      eventByIdMock: jest.fn(async (req, res) =>
        res.status(200).json({
          id: 1,
          eventName: "Tree Planting",
          description: "Plant trees in the park",
          urgency: "low",
          date: "2025-11-01",
          startTime: "09:00",
          endTime: "12:00",
        })
      ),
    });

    const res = await request(app).get("/api/events/1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("eventName", "Tree Planting");
  });

  test("GET /api/events/:id returns 404 if not found", async () => {
    const app = await setupAppWithMocks({
      allEventsMock: jest.fn(),
      eventByIdMock: jest.fn(async (req, res) =>
        res.status(404).json({ message: "Event not found" })
      ),
    });

    const res = await request(app).get("/api/events/999");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Event not found");
  });

  test("GET /api/events/:id handles DB errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const app = await setupAppWithMocks({
      allEventsMock: jest.fn(),
      eventByIdMock: jest.fn(async (req, res) => {
        throw new Error("DB failure");
      }),
    });

    const res = await request(app).get("/api/events/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("message", "Error fetching event details");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
