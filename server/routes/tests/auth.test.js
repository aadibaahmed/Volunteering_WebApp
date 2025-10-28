import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// ✅ use ESM-compatible unstable_mockModule
jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

// dynamically import mocked modules and the route
const bcrypt = (await import("bcrypt")).default;
const jwt = (await import("jsonwebtoken")).default;
const authRoutes = (await import("../auth.routes.js")).default;

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "testsecret";
  });

  test("POST /auth/register → creates new user", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");
    jwt.sign.mockReturnValue("fakeToken");

    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "new@volunteer.com",
        password: "password123",
        first_name: "New",
        last_name: "User",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token", "fakeToken");
    expect(res.body.user.email).toBe("new@volunteer.com");
  });

  test("POST /auth/register → rejects missing email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "abc123" });
    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/register → rejects existing user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "admin@volunteer.com", password: "admin123" });
    expect(res.statusCode).toBe(409);
  });

  test("POST /auth/login → valid credentials return token", async () => {
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("token123");

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@volunteer.com", password: "admin123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /auth/login → invalid credentials", async () => {
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@volunteer.com", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
  });

  test("POST /auth/login → missing fields", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.statusCode).toBe(400);
  });
});

test("POST /auth/register → rejects invalid email format", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "bad", password: "password123" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  test("POST /auth/register → rejects short password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "short@volunteer.com", password: "123" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test("POST /auth/register → rejects invalid role", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "role@volunteer.com",
        password: "password123",
        role: "admin",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  test("POST /auth/register → handles internal error gracefully", async () => {
    // make bcrypt.hash throw to simulate failure
    bcrypt.hash.mockRejectedValueOnce(new Error("hashing failed"));
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "err@volunteer.com", password: "password123" });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/registration failed/i);
  });

  test("POST /auth/login → handles server error gracefully", async () => {
    // force bcrypt.compare to throw
    bcrypt.compare.mockRejectedValueOnce(new Error("bcrypt error"));
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@volunteer.com", password: "admin123" });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/login failed/i);
  });
