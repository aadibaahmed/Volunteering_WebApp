
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mock DB (MUST be before importing the router) ---
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: jest.fn() },
}));

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

// dynamic imports AFTER mocks
const { pool } = await import("../../database.js");
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

  // -------------------- REGISTER --------------------

  test("POST /auth/register → creates new user (covers 28–37)", async () => {
    // 1) uniqueness check -> none found
    pool.query
      .mockResolvedValueOnce({ rowCount: 0 }) // SELECT 1 ...
      .mockResolvedValueOnce({
        // INSERT ... RETURNING
        rows: [{ user_id: 123, email: "new@volunteer.com", role: "user" }],
      });

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
    // token payload signed correctly
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 123, email: "new@volunteer.com", role: "user" },
      "testsecret",
      { expiresIn: "2h" }
    );
    expect(res.body).toEqual({
      token: "fakeToken",
      user: { id: 123, email: "new@volunteer.com", role: "user" },
    });
  });

  test("POST /auth/register → rejects missing email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "abc123" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email & password required/i);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST /auth/register → rejects existing user", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 }); // SELECT finds existing
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "admin@volunteer.com", password: "admin123" });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("POST /auth/register → handles internal error gracefully", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 }); // uniqueness OK
    bcrypt.hash.mockRejectedValueOnce(new Error("hashing failed"));
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "err@volunteer.com", password: "password123" });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/registration failed/i);
  });

  // -------------------- LOGIN --------------------

  test("POST /auth/login → valid credentials return token", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: 1,
          email: "admin@volunteer.com",
          password_hash: "hash",
          role: "superuser",
          is_active: true,
        },
      ],
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("token123");

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@volunteer.com", password: "admin123" });

    expect(res.statusCode).toBe(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 1, email: "admin@volunteer.com", role: "superuser" },
      "testsecret",
      { expiresIn: "2h" }
    );
    expect(res.body).toEqual({
      token: "token123",
      user: { id: 1, email: "admin@volunteer.com", role: "superuser" },
    });
  });

  test("POST /auth/login → invalid credentials", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: 2,
          email: "admin@volunteer.com",
          password_hash: "hash",
          role: "user",
          is_active: true,
        },
      ],
    });
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@volunteer.com", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test("POST /auth/login → missing fields", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email & password required/i);
  });

  test("POST /auth/login → user not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@vol.com", password: "x" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test("POST /auth/login → account disabled", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: 3,
          email: "disabled@vol.com",
          password_hash: "hash",
          role: "user",
          is_active: false,
        },
      ],
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "disabled@vol.com", password: "pw" });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/account disabled/i);
  });

  test("POST /auth/login → handles server error gracefully", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: 4,
          email: "e@vol.com",
          password_hash: "hash",
          role: "user",
          is_active: true,
        },
      ],
    });
    bcrypt.compare.mockRejectedValueOnce(new Error("bcrypt error"));
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "e@vol.com", password: "admin123" });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/login failed/i);
  });
});

test.skip("POST /auth/register → rejects invalid email format", async () => {});
test.skip("POST /auth/register → rejects short password", async () => {});
test.skip("POST /auth/register → rejects invalid role", async () => {});
