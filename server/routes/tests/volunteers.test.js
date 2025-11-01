// server/routes/tests/volunteers.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    const role = req.headers["x-role"] || "superuser";
    req.user = { id: 42, role };
    next();
  },
}));

// Mock PG pool
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: jest.fn() },
}));

// Mock bcrypt.hash
jest.unstable_mockModule("bcrypt", () => ({
  default: { hash: jest.fn(async () => "hashed-password") },
  hash: jest.fn(async () => "hashed-password"),
}));

// ---------------- Imports after mocks ----------------
const { pool } = await import("../../database.js");
const bcrypt = (await import("bcrypt")).default;
const volunteersRouterModule = await import("../volunteers.routes.js");
const volunteersRouter = volunteersRouterModule.default || volunteersRouterModule;

// Build app
const app = express();
app.use(express.json());
app.use("/api/volunteers", volunteersRouter);

// ---------------- Tests ----------------
describe("volunteers.routes.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- POST /api/volunteers ----------
  test("POST -> 403 when role is not superuser", async () => {
    const res = await request(app)
      .post("/api/volunteers")
      .set("x-role", "user")
      .send({ email: "v@x.com", password: "pw" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST -> 400 when email/password missing", async () => {
    const res = await request(app)
      .post("/api/volunteers")
      .set("x-role", "superuser")
      .send({ email: "only@email.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email & password required/i);
  });

  test("POST -> 409 when user already exists", async () => {
    // SELECT 1 FROM user_credentials WHERE email=$1
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post("/api/volunteers")
      .send({ email: "dupe@site.com", password: "pw" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("POST -> 201 creates volunteer", async () => {
    // exists query -> not found
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    // insert user -> returning row
    pool.query.mockResolvedValueOnce({
      rows: [{ user_id: 7, email: "new@x.com", role: "user" }],
    });

    const res = await request(app)
      .post("/api/volunteers")
      .send({ email: "new@x.com", password: "StrongPW1!" });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/created successfully/i);
    expect(res.body.volunteer).toMatchObject({
      volunteerId: 7,
      email: "new@x.com",
      role: "user",
    });

    // Verify the INSERT called with hashed password
    const lastCallArgs = pool.query.mock.calls[1][1]; // args to INSERT
    expect(lastCallArgs[1]).toBe("hashed-password");
  });

  test("POST -> 500 on DB error", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 }); // exists -> none
    pool.query.mockRejectedValueOnce(new Error("insert failed"));
    const res = await request(app)
      .post("/api/volunteers")
      .send({ email: "e@x.com", password: "pw" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to create volunteer/i);
  });

  // ---------- PUT /api/volunteers/:id ----------
  test("PUT -> 403 when role is not superuser", async () => {
    const res = await request(app)
      .put("/api/volunteers/5")
      .set("x-role", "user")
      .send({ first_name: "A" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("PUT -> 404 when volunteer does not exist", async () => {
    // existence check query
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app)
      .put("/api/volunteers/999")
      .send({ first_name: "A" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("PUT -> 409 when new email is already in use", async () => {
    // exists -> found
    pool.query.mockResolvedValueOnce({ rowCount: 1 }); // user exists
    // BEGIN
    pool.query.mockResolvedValueOnce({});
    // emailExists -> found another user
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // ROLLBACK
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/5")
      .send({ email: "taken@site.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email already in use/i);

    // Ensure ROLLBACK happened
    const calls = pool.query.mock.calls.map(c => (c[0] || "").trim());
    expect(calls).toContain("ROLLBACK");
  });

  test("PUT -> 200 updates profile + skills + availability (and commits)", async () => {
    // Sequence of queries the route will perform
    // 1) exists
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // 2) BEGIN
    pool.query.mockResolvedValueOnce({});
    // 3) upsert user_profile
    pool.query.mockResolvedValueOnce({}); // INSERT ... ON CONFLICT
    // 4) delete user_skills
    pool.query.mockResolvedValueOnce({});
    // 5) upsert skill #1 -> returning id
    pool.query.mockResolvedValueOnce({ rows: [{ skill_id: 11 }] });
    // 6) insert user_skill #1
    pool.query.mockResolvedValueOnce({});
    // 7) upsert skill #2
    pool.query.mockResolvedValueOnce({ rows: [{ skill_id: 12 }] });
    // 8) insert user_skill #2
    pool.query.mockResolvedValueOnce({});
    // 9) delete availability
    pool.query.mockResolvedValueOnce({});
    // 10) insert availability #1
    pool.query.mockResolvedValueOnce({});
    // 11) insert availability #2
    pool.query.mockResolvedValueOnce({});
    // 12) COMMIT
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/5")
      .send({
        first_name: "Jess",
        last_name: "Nguyen",
        address1: "123 Main",
        city: "Houston",
        state_code: "TX",
        zip_code: "77004",
        preferences: "weekends",
        skills: ["Cooking", "First Aid"],
        availability: ["2025-11-10", "2025-11-12"],
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    const calls = pool.query.mock.calls.map(c => (c[0] || "").trim());
    expect(calls).toContain("BEGIN");
    expect(calls).toContain("COMMIT");
  });

  test("PUT -> 500 on error inside transaction (rollback)", async () => {
    // exists
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // BEGIN
    pool.query.mockResolvedValueOnce({});
    // cause an error mid-way (e.g., profile upsert fails)
    pool.query.mockRejectedValueOnce(new Error("profile upsert failed"));
    // ROLLBACK (the route catches and does rollback)
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/5")
      .send({ first_name: "X" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to update volunteer/i);

    const calls = pool.query.mock.calls.map(c => (c[0] || "").trim());
    expect(calls).toContain("ROLLBACK");
  });

  // ---- Added credential-update branch coverage ----
  test("PUT -> 200 updates user_credentials (email + password) and COMMITs", async () => {
    // 1) volunteer exists
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // 2) BEGIN
    pool.query.mockResolvedValueOnce({});
    // 3) emailExists (no conflict)
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    // 4) UPDATE user_credentials (email, password_hash)
    pool.query.mockResolvedValueOnce({});
    // 5) COMMIT
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/15")
      .send({ email: "new@mail.com", password: "NewPass!234" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    // bcrypt called
    expect(bcrypt.hash).toHaveBeenCalledWith("NewPass!234", 10);

    // Check the UPDATE call received correct SQL + params order
    const updateCall = pool.query.mock.calls.find(
      ([sql]) => (sql || "").includes("UPDATE user_credentials")
    );
    expect(updateCall).toBeTruthy();

    const [sql, params] = updateCall;
    // should set email then password_hash, then WHERE user_id=$3
    expect(sql.replace(/\s+/g, " ")).toMatch(
      /SET .*email *= *\$\d.*password_hash *= *\$\d.*WHERE user_id *= *\$\d/i
    );
    expect(params[0]).toBe("new@mail.com");
    expect(params[1]).toBe("hashed-password");
    expect(params[2]).toBe("15"); // id is appended last
  });

  test("PUT -> 200 updates credentials when ONLY password provided", async () => {
    // 1) exists
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // 2) BEGIN
    pool.query.mockResolvedValueOnce({});
    // (no emailExists query because no email given)
    // 3) UPDATE only password_hash
    pool.query.mockResolvedValueOnce({});
    // 4) COMMIT
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/22")
      .send({ password: "OnlyPass#1" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    expect(bcrypt.hash).toHaveBeenCalledWith("OnlyPass#1", 10);

    const updateCall = pool.query.mock.calls.find(
      ([sql]) => (sql || "").includes("UPDATE user_credentials")
    );
    const [sql, params] = updateCall;

    expect(sql).toMatch(/password_hash/i);
    // params: [hashedPassword, id]
    expect(params[0]).toBe("hashed-password");
    expect(params[1]).toBe("22");
  });

  test("PUT -> 200 updates credentials when ONLY email provided", async () => {
    // 1) exists
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // 2) BEGIN
    pool.query.mockResolvedValueOnce({});
    // 3) emailExists (no conflict)
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    // 4) UPDATE only email
    pool.query.mockResolvedValueOnce({});
    // 5) COMMIT
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .put("/api/volunteers/33")
      .send({ email: "unique@mail.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    const updateCall = pool.query.mock.calls.find(
      ([sql]) => (sql || "").includes("UPDATE user_credentials")
    );
    const [, params] = updateCall;

    // params: [email, id]
    expect(params[0]).toBe("unique@mail.com");
    expect(params[1]).toBe("33");
  });

  // ---------- DELETE /api/volunteers/:id ----------
  test("DELETE -> 403 when role is not superuser", async () => {
    const res = await request(app)
      .delete("/api/volunteers/3")
      .set("x-role", "user");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("DELETE -> 404 when volunteer not found", async () => {
    // exists -> none
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete("/api/volunteers/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("DELETE -> 200 deactivates user", async () => {
    // exists -> found
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // update is_active=false
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete("/api/volunteers/8");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated successfully/i);
  });

  test("DELETE -> 500 on DB error", async () => {
    // exists -> found
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    // update throws
    pool.query.mockRejectedValueOnce(new Error("update failed"));

    const res = await request(app).delete("/api/volunteers/8");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to delete volunteer/i);
  });

  // ---------- GET /api/volunteers/:id/profile ----------
  test("GET profile -> 403 when role is not superuser", async () => {
    const res = await request(app)
      .get("/api/volunteers/5/profile")
      .set("x-role", "user");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("GET profile -> 404 when volunteer not found", async () => {
    // primary select returns no rows
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/volunteers/777/profile");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("GET profile -> 200 returns merged profile + skills + availability", async () => {
    // main row
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          user_id: 5,
          email: "v@x.com",
          role: "user",
          first_name: "Jess",
          last_name: "Nguyen",
          address1: "123 Main",
          address2: null,
          city: "Houston",
          state_code: "TX",
          zip_code: "77004",
          preferences: "wknds",
          completed: true,
        },
      ],
    });
    // skills rows
    pool.query.mockResolvedValueOnce({
      rows: [{ name: "Cooking" }, { name: "First Aid" }],
    });
    // availability rows
    pool.query.mockResolvedValueOnce({
      rows: [{ avail_date: "2025-11-10" }, { avail_date: "2025-11-12" }],
    });

    const res = await request(app).get("/api/volunteers/5/profile");
    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual(["Cooking", "First Aid"]);
    expect(res.body.availability).toEqual(["2025-11-10", "2025-11-12"]);
    expect(res.body.email).toBe("v@x.com");
  });

  test("GET profile -> 500 on DB error", async () => {
    pool.query.mockRejectedValueOnce(new Error("join failed"));
    const res = await request(app).get("/api/volunteers/5/profile");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch volunteer profile/i);
  });
});
