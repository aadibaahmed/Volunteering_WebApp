// server/routes/tests/profile.routes.db.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mocks must come BEFORE importing the router ---
jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: jest.fn() },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    // consistent "logged-in user" id
    req.user = { sub: 2 };
    next();
  },
}));

// Dynamic imports AFTER mocks
const { pool } = await import("../../database.js");
const profileRouter = (await import("../profile.routes.js")).default;

// Build app
const app = express();
app.use(express.json());
app.use("/profile", profileRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------- GET /profile/me ----------------

test("GET /profile/me → returns null when profile not found (covers early return)", async () => {
  // Promise.all() runs all three queries, but profile rows empty should send null
  pool.query
    // profile
    .mockResolvedValueOnce({ rows: [] })
    // skills
    .mockResolvedValueOnce({ rows: [] })
    // availability
    .mockResolvedValueOnce({ rows: [] });

  const res = await request(app).get("/profile/me");
  expect(res.status).toBe(200);
  expect(res.body).toBeNull();
});

test("GET /profile/me → 500 when DB throws in any query (catch path)", async () => {
  pool.query.mockRejectedValueOnce(new Error("boom"));
  const res = await request(app).get("/profile/me");
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/failed to fetch profile/i);
});

// ---------------- POST /profile ----------------

test("POST /profile → 500 when UPSERT fails (catch path)", async () => {
  pool.query.mockRejectedValueOnce(new Error("insert failed"));
  const res = await request(app).post("/profile").send({
    first_name: "A",
    last_name: "B",
    address1: "123 St",
    city: "Houston",
    state_code: "TX",
    zip_code: "77004",
  });
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/profile save failed/i);
});

// ---------------- PUT /profile/skills ----------------

test("PUT /profile/skills → 500 with transaction ROLLBACK on error", async () => {
  // BEGIN ok
  pool.query.mockResolvedValueOnce({});
  // first INSERT INTO skills throws
  pool.query.mockRejectedValueOnce(new Error("skills upsert error"));
  // ROLLBACK ok
  pool.query.mockResolvedValueOnce({});

  const res = await request(app).put("/profile/skills").send(["CPR"]);
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/skills update failed/i);

  const calls = pool.query.mock.calls.map(([sql]) => (sql || "").toString().trim());
  expect(calls).toContain("BEGIN");
  expect(calls).toContain("ROLLBACK");
});

test("PUT /profile/skills → 200 full happy path (BEGIN/COMMIT, deletes + reinserts)", async () => {
  // BEGIN
  pool.query.mockResolvedValueOnce({});
  // INSERT skill -> returning id
  pool.query.mockResolvedValueOnce({ rows: [{ skill_id: 11 }] });
  // DELETE user_skills
  pool.query.mockResolvedValueOnce({});
  // INSERT user_skills
  pool.query.mockResolvedValueOnce({});
  // COMMIT
  pool.query.mockResolvedValueOnce({});

  const res = await request(app).put("/profile/skills").send(["First Aid"]);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, count: 1 });

  const calls = pool.query.mock.calls.map(([sql]) => (sql || "").toString().replace(/\s+/g, " ").trim());
  expect(calls.some((s) => s === "BEGIN")).toBe(true);
  expect(calls.some((s) => s === "COMMIT")).toBe(true);
});

// ---------------- PUT /profile/availability ----------------

test("PUT /profile/availability → 500 with transaction ROLLBACK on insert error", async () => {
  // BEGIN
  pool.query.mockResolvedValueOnce({});
  // DELETE existing availability
  pool.query.mockResolvedValueOnce({});
  // INSERT new availability throws
  pool.query.mockRejectedValueOnce(new Error("availability insert failed"));
  // ROLLBACK
  pool.query.mockResolvedValueOnce({});

  const res = await request(app).put("/profile/availability").send(["2025-01-01"]);
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/availability update failed/i);

  const calls = pool.query.mock.calls.map(([sql]) => (sql || "").toString().trim());
  expect(calls).toContain("BEGIN");
  expect(calls).toContain("ROLLBACK");
});

// ---------------- POST /profile/complete ----------------

test("POST /profile/complete → 400 when no skills", async () => {
  // SELECT 1 FROM user_skills LIMIT 1 -> 0 rows
  pool.query
    .mockResolvedValueOnce({ rowCount: 0 }) // skills
    .mockResolvedValueOnce({ rowCount: 1 }); // availability (won’t be checked)
  const res = await request(app).post("/profile/complete").send();
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/at least one skill/i);
});

test("POST /profile/complete → 400 when no availability", async () => {
  // skills exists, availability empty
  pool.query
    .mockResolvedValueOnce({ rowCount: 1 }) // skills
    .mockResolvedValueOnce({ rowCount: 0 }); // availability
  const res = await request(app).post("/profile/complete").send();
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/availability date/i);
});

test("POST /profile/complete → 200 success (INSERT..ON CONFLICT)", async () => {
  // both exist
  pool.query
    .mockResolvedValueOnce({ rowCount: 1 }) // skills
    .mockResolvedValueOnce({ rowCount: 1 }) // availability
    .mockResolvedValueOnce({
      rows: [{ user_id: 2, completed: true }],
    }); // upsert profile

  const res = await request(app).post("/profile/complete").send();
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ id: 2, completed: true });
});

test("POST /profile/complete → 500 when upsert throws", async () => {
  pool.query
    .mockResolvedValueOnce({ rowCount: 1 }) // skills ok
    .mockResolvedValueOnce({ rowCount: 1 }) // availability ok
    .mockRejectedValueOnce(new Error("upsert failed")); // upsert error

  const res = await request(app).post("/profile/complete").send();
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/failed to complete profile/i);
});

test("GET /profile/me → 200 happy path (maps skills & availability)", async () => {
  // profile row
  pool.query
    .mockResolvedValueOnce({
      rows: [{
        user_id: 2,
        first_name: "Jess",
        last_name: "Nguyen",
        address1: "123",
        address2: null,
        city: "Houston",
        state_code: "TX",
        zip_code: "77004",
        preferences: "wknds",
        completed: true
      }]
    })
    // skills rows
    .mockResolvedValueOnce({ rows: [{ name: "CPR" }, { name: "First Aid" }] })
    // availability rows
    .mockResolvedValueOnce({ rows: [{ avail_date: "2025-11-10" }, { avail_date: "2025-11-12" }] });

  const res = await request(app).get("/profile/me");
  expect(res.status).toBe(200);
  expect(res.body.first_name).toBe("Jess");
  expect(res.body.skills).toEqual(["CPR", "First Aid"]);
  expect(res.body.availability).toEqual(["2025-11-10", "2025-11-12"]);
});

test("POST /profile → 200 success (UPSERT + RETURNING)", async () => {
  pool.query.mockResolvedValueOnce({
    rows: [{ user_id: 2, first_name: "Updated", last_name: "User", completed: false }]
  });

  const res = await request(app).post("/profile").send({
    first_name: "Updated",
    last_name: "User",
    address1: "789 Updated St",
    address2: null,
    city: "Houston",
    state_code: "TX",
    zip_code: "77004",
    preferences: "teaching"
  });

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ user_id: 2, first_name: "Updated", last_name: "User" });
});

test("PUT /profile/skills → 200 when sending empty array (DELETE + COMMIT, count=0)", async () => {
  // BEGIN
  pool.query.mockResolvedValueOnce({});
  // (no INSERT INTO skills because array empty)
  // DELETE user_skills
  pool.query.mockResolvedValueOnce({});
  // (no INSERT user_skills because none)
  // COMMIT
  pool.query.mockResolvedValueOnce({});

  const res = await request(app).put("/profile/skills").send([]);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, count: 0 });

  const calls = pool.query.mock.calls.map(([sql]) => (sql || "").toString().trim());
  expect(calls).toContain("BEGIN");
  expect(calls).toContain("COMMIT");
});

test("PUT /profile/availability → 200 happy path (BEGIN → DELETE → INSERTs → COMMIT)", async () => {
  // BEGIN
  pool.query.mockResolvedValueOnce({});
  // DELETE existing
  pool.query.mockResolvedValueOnce({});
  // INSERT date #1
  pool.query.mockResolvedValueOnce({});
  // INSERT date #2
  pool.query.mockResolvedValueOnce({});
  // COMMIT
  pool.query.mockResolvedValueOnce({});

  const dates = ["2025-01-01", "2025-01-05"];
  const res = await request(app).put("/profile/availability").send(dates);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, count: 2 });

  const calls = pool.query.mock.calls.map(([sql]) => (sql || "").toString().replace(/\s+/g, " ").trim());
  expect(calls.some(s => s === "BEGIN")).toBe(true);
  expect(calls.some(s => s.startsWith("DELETE FROM user_availability"))).toBe(true);
  expect(calls.some(s => s.startsWith("INSERT INTO user_availability"))).toBe(true);
  expect(calls.some(s => s === "COMMIT")).toBe(true);
});
