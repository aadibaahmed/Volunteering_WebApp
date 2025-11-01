
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    // Allow switching roles via header for tests
    req.user = { id: 1, role: req.headers["x-role"] || "superuser" };
    next();
  },
}));

jest.unstable_mockModule("../../database.js", () => ({
  pool: { query: jest.fn() },
}));

const { pool } = await import("../../database.js");
const routerModule = await import("../volunteer_matching.routes.js");
const volunteerMatchingRouter = routerModule.default || routerModule;

// Minimal app
const app = express();
app.use(express.json());
app.use("/api/matching", volunteerMatchingRouter);

describe("volunteer_matching.routes.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Utility helpers to build consistent fixtures
  const makeVolunteerRow = (over = {}) => ({
    id: 101,
    email: "vol@ex.com",
    first_name: "Jess",
    last_name: "Nguyen",
    city: "Houston",
    state_code: "TX",
    preferences: ["cleanup"],
    completed: true,
    ...over,
  });

  const makeEventRow = (over = {}) => ({
    id: 501,
    name: "Park Cleanup",
    description: "Neighborhood cleanup",
    location: "Houston, TX",
    required_skills: "First Aid, Teamwork",
    urgency: "medium",
    date: "2025-11-10",
    maxVolunteers: 5,
    ...over,
  });

  // --------------------- /event/:eventId ---------------------
  test("GET /event/:eventId -> 400 on invalid event id", async () => {
    const res = await request(app).get("/api/matching/event/not-a-number");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid event id/i);
  });

  test("GET /event/:eventId -> 200 success with matches >= 50", async () => {
    // Mock DB for getAllEvents + getAllVolunteers (including skills & availability)
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};

      // events list
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              description: "cleanup event",
              location: "Houston, TX",
              required_skills: "First Aid, Teamwork",
              urgency: "medium",
              date: "2025-11-10",
              max_volunteers: 5,
            },
          ],
        };
      }

      // volunteers base rows
      if (sql.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 101,
              email: "vol@ex.com",
              first_name: "Jess",
              last_name: "Nguyen",
              city: "Houston",
              state_code: "TX",
              preferences: ["cleanup"],
              completed: true,
            },
          ],
        };
      }

      // user skills
      if (sql.includes("from user_skills")) {
        expect(params[0]).toBe(101);
        return { rows: [{ name: "First Aid" }, { name: "Teamwork" }] };
      }

      // availability
      if (sql.includes("from user_availability")) {
        return { rows: [{ avail_date: "2025-11-10" }] };
      }

      // default
      return { rows: [] };
    });

    const res = await request(app).get("/api/matching/event/501");
    expect(res.status).toBe(200);
    // Should produce at least one match with score >= 50
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("matchScore");
    expect(res.body[0].matchScore).toBeGreaterThanOrEqual(50);
  });

  // --------------------- /volunteer/:volunteerId ---------------------
  test("GET /volunteer/:id -> 400 on invalid volunteer id", async () => {
    const res = await request(app).get("/api/matching/volunteer/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid volunteer id/i);
  });

  test("GET /volunteer/:id -> 200 success (filters past events)", async () => {
    // volunteer list (one completed volunteer with availability)
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("from user_credentials uc")) {
        return { rows: [makeVolunteerRow()] };
      }
      if (sql.includes("from user_skills")) {
        return { rows: [{ name: "First Aid" }] };
      }
      if (sql.includes("from user_availability")) {
        return { rows: [{ avail_date: "2025-11-10" }] };
      }
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        // include a past event to ensure filter works
        return {
          rows: [
            {
              id: 600,
              name: "Old Event",
              description: "past",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2020-01-01",
              max_volunteers: 5,
            },
            {
              id: 601,
              name: "Future Event",
              description: "cleanup",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2099-12-31",
              max_volunteers: 5,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await request(app).get("/api/matching/volunteer/101");
    expect(res.status).toBe(200);
    // Should only include the future event match
    expect(res.body.length).toBe(1);
    expect(res.body[0].event.id).toBe(601);
  });

  // --------------------- /all (manager only) ---------------------
  test("GET /all -> 403 for non-superuser", async () => {
    const res = await request(app).get("/api/matching/all").set("x-role", "user");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("GET /all -> 200 success with enriched matches", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};

      if (sql.includes("from volunteer_matches")) {
        return {
          rows: [
            {
              id: 1,
              event_id: 501,
              volunteer_id: 101,
              match_score: 88,
              status: "assigned",
              assigned_date: new Date("2025-11-01"),
              notes: "Bring gloves",
            },
          ],
        };
      }

      if (sql.includes("from user_credentials uc")) {
        return { rows: [makeVolunteerRow()] };
      }

      if (sql.includes("from user_skills")) {
        return { rows: [{ name: "First Aid" }, { name: "Teamwork" }] };
      }

      if (sql.includes("from user_availability")) {
        return { rows: [{ avail_date: "2025-11-10" }] };
      }

      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              event_description: "cleanup event",
              location: "Houston, TX",
              required_skills: "First Aid, Teamwork",
              urgency: "medium",
              date: "2025-11-10",
              max_volunteers: 5,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const res = await request(app).get("/api/matching/all");
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 1,
      eventId: 501,
      volunteerId: 101,
      matchScore: 88,
      status: "assigned",
      notes: "Bring gloves",
    });
    expect(res.body[0].volunteer.name).toMatch(/jess/i);
    expect(res.body[0].event.name).toMatch(/park cleanup/i);
  });

  // --------------------- /assign (manager only) ---------------------
  test("POST /assign -> 403 for non-superuser", async () => {
    const res = await request(app)
      .post("/api/matching/assign")
      .set("x-role", "user")
      .send({ volunteerId: 101, eventId: 501 });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("POST /assign -> 400 validation errors", async () => {
    let res = await request(app).post("/api/matching/assign").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);

    res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: "101", eventId: 501 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be numbers/i);

    res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: 101, eventId: 501, notes: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/notes must be a string/i);
  });

  test("POST /assign -> 201 assigns volunteer", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};
      // volunteers
      if (sql.includes("from user_credentials uc")) {
        return { rows: [makeVolunteerRow()] };
      }
      if (sql.includes("from user_skills")) return { rows: [{ name: "First Aid" }] };
      if (sql.includes("from user_availability")) return { rows: [{ avail_date: "2025-11-10" }] };

      // events
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              event_description: "cleanup",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2025-11-10",
              max_volunteers: 5,
            },
          ],
        };
      }

      // existing assignment check
      if (sql.includes("select id from volunteer_matches")) {
        expect(params).toEqual([501, 101]); // eventId, volunteerId
        return { rowCount: 0, rows: [] };
      }

      // insert assignment
      if (sql.includes("insert into volunteer_matches")) {
        return {
          rows: [
            {
              id: 99,
              event_id: 501,
              volunteer_id: 101,
              match_score: 95,
              status: "assigned",
              assigned_date: new Date("2025-11-01"),
              notes: "gloves",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: 101, eventId: 501, notes: "gloves" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 99,
      eventId: 501,
      volunteerId: 101,
      matchScore: 95,
      status: "assigned",
      notes: "gloves",
    });
  });

  test("POST /assign -> 500 when already assigned", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};
      if (sql.includes("from user_credentials uc")) {
        return { rows: [makeVolunteerRow()] };
      }
      if (sql.includes("from user_skills")) return { rows: [{ name: "First Aid" }] };
      if (sql.includes("from user_availability")) return { rows: [{ avail_date: "2025-11-10" }] };
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return { rows: [makeEventRow()] };
      }
      if (sql.includes("select id from volunteer_matches")) {
        return { rowCount: 1, rows: [{ id: 1 }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: 101, eventId: 501 });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/already assigned/i);
  });

  // --------------------- PUT /:matchId/status ---------------------
  test("PUT /:matchId/status -> 400 invalid match id", async () => {
    const res = await request(app).put("/api/matching/notnum/status").send({ status: "assigned" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid match id/i);
  });

  test("PUT /:matchId/status -> 400 invalid/missing status", async () => {
    let res = await request(app).put("/api/matching/10/status").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status is required/i);

    res = await request(app).put("/api/matching/10/status").send({ status: "WRONG" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  test("PUT /:matchId/status -> 200 success", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};

      if (sql.includes("update volunteer_matches")) {
        expect(params).toEqual(["completed", 10]);
        return {
          rows: [
            {
              id: 10,
              event_id: 501,
              volunteer_id: 101,
              match_score: 80,
              status: "completed",
              assigned_date: new Date("2025-11-01"),
              notes: "done",
            },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await request(app).put("/api/matching/10/status").send({ status: "completed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  test("PUT /:matchId/status -> 500 when match not found", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();
      if (sql.includes("create table if not exists volunteer_matches")) return {};
      if (sql.includes("update volunteer_matches")) return { rows: [] }; // no rows updated
      return { rows: [] };
    });

    const res = await request(app).put("/api/matching/10/status").send({ status: "pending" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/match not found/i);
  });

  // --------------------- GET /history/:volunteerId ---------------------
  test("GET /history/:volunteerId -> 400 invalid id", async () => {
    const res = await request(app).get("/api/matching/history/xyz");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid volunteer id/i);
  });

  test("GET /history/:volunteerId -> 200 list", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};

      if (sql.includes("from volunteer_matches vm where vm.volunteer_id =")) {
        return {
          rows: [
            {
              id: 1,
              event_id: 501,
              volunteer_id: 101,
              match_score: 87,
              status: "completed",
              assigned_date: new Date("2025-11-01"),
              notes: "great job",
            },
          ],
        };
      }

      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              event_description: "cleanup",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2025-11-10",
              max_volunteers: 5,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const res = await request(app).get("/api/matching/history/101");
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 1,
      eventId: 501,
      volunteerId: 101,
      status: "completed",
    });
    expect(res.body[0].event.name).toMatch(/park cleanup/i);
  });

  // --------------------- POST /generate/:eventId (manager only) ---------------------
  test("POST /generate/:eventId -> 403 for non-superuser", async () => {
    const res = await request(app)
      .post("/api/matching/generate/501")
      .set("x-role", "user");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  test("POST /generate/:eventId -> 400 invalid event id", async () => {
    const res = await request(app).post("/api/matching/generate/NaN");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid event id/i);
  });

  test("POST /generate/:eventId -> 200 returns matches", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();

      if (sql.includes("create table if not exists volunteer_matches")) return {};

      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              event_description: "cleanup",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2025-11-10",
              max_volunteers: 5,
            },
          ],
        };
      }

      if (sql.includes("from user_credentials uc")) {
        return { rows: [makeVolunteerRow()] };
      }
      if (sql.includes("from user_skills")) return { rows: [{ name: "First Aid" }] };
      if (sql.includes("from user_availability")) return { rows: [{ avail_date: "2025-11-10" }] };

      return { rows: [] };
    });

    const res = await request(app).post("/api/matching/generate/501");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].matchScore).toBeGreaterThanOrEqual(50);
  });
});
test("GET /event/:id -> covers parseSkills(non-string) and locationScore=0", async () => {
    // Event has required_skills as a NUMBER (truthy) so calculateMatchScore calls parseSkills(42)
    // parseSkills should return [], triggering the 'no required skills' +30 branch.
    // Volunteer has no state_code => locationScore=0.
    // Availability matches => +25. Total >= 55.
    pool.query.mockImplementation(async (sql, params) => {
      sql = (sql || "").toString().toLowerCase();
  
      if (sql.includes("create table if not exists volunteer_matches")) return {};
  
      // events list: required_skills is a NUMBER-like value through mapping
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 777,
              name: "General Help",
              event_description: "help us",
              location: "Austin, TX",
              required_skills: 42,         // non-string/array to hit parseSkills 'else' branch
              urgency: "low",
              date: "2099-01-01",
              max_volunteers: 5,
            },
          ],
        };
      }
  
      // volunteers base rows: no state_code to force locationScore=0
      if (sql.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 3001,
              email: "v@x.com",
              first_name: "NoState",
              last_name: "User",
              city: "Houston",
              state_code: "",              // missing => location score 0
              preferences: ["help"],
              completed: true,
            },
          ],
        };
      }
  
      if (sql.includes("from user_skills")) {
        expect(params[0]).toBe(3001);
        return { rows: [] };             // no skills; still fine because parseSkills returned []
      }
  
      if (sql.includes("from user_availability")) {
        return { rows: [{ avail_date: "2099-01-01" }] }; // +25 availability
      }
  
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/event/777");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    // Score should be >= 55 (30 no-req-skills + 25 availability)
    expect(res.body[0].matchScore).toBeGreaterThanOrEqual(55);
  });
  
  test("GET /all -> covers ensureVolunteerMatchesTable catch and helper fallbacks", async () => {
    let firstCreateTable = true;
  
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();
  
      // Force ensureVolunteerMatchesTable to enter its catch once
      if (sql.includes("create table if not exists volunteer_matches")) {
        if (firstCreateTable) {
          firstCreateTable = false;
          throw new Error("DDL fail once");
        }
        return {};
      }
  
      // volunteer_matches rows
      if (sql.includes("from volunteer_matches")) {
        return {
          rows: [
            {
              id: 2,
              event_id: 888,
              volunteer_id: 444,
              match_score: 70,
              status: "assigned",
              assigned_date: new Date("2099-01-02"),
              notes: "note",
            },
          ],
        };
      }
  
      // getAllVolunteers base fails to trigger its catch -> []
      if (sql.includes("from user_credentials uc")) {
        throw new Error("base volunteer fetch failed");
      }
  
      // getAllEvents returns one event
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 888,
              name: "Charity Fair",
              event_description: "fair",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "medium",
              date: "2099-01-03",
              max_volunteers: 10,
            },
          ],
        };
      }
  
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/all");
    expect(res.status).toBe(200);
    // With volunteers [], the enrichment may yield volunteer: null, but route still returns rows.
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      id: 2,
      eventId: 888,
      volunteerId: 444,
      matchScore: 70,
      status: "assigned",
    });
  });
  
  test("GET /volunteer/:id -> helper catch path (getAllEvents fails => returns [])", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();
  
      if (sql.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 555,
              email: "v@x.com",
              first_name: "Ok",
              last_name: "User",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: true,
            },
          ],
        };
      }
  
      if (sql.includes("from user_skills")) return { rows: [{ name: "First Aid" }] };
      if (sql.includes("from user_availability")) return { rows: [{ avail_date: "2099-01-01" }] };
  
      // Force getAllEvents catch -> []
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        throw new Error("events fetch failed");
      }
  
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/volunteer/555");
    expect(res.status).toBe(200);
    // No events -> no matches
    expect(res.body).toEqual([]);
  });
  
  test("GET /event/:id -> helper catch path (getAllVolunteers fails => returns [])", async () => {
    pool.query.mockImplementation(async (sql) => {
      sql = (sql || "").toString().toLowerCase();
  
      if (sql.includes("from events") && !sql.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 321,
              name: "Any Event",
              event_description: "",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-05-01",
              max_volunteers: 1,
            },
          ],
        };
      }
  
      // Force getAllVolunteers catch
      if (sql.includes("from user_credentials uc")) {
        throw new Error("volunteers fetch failed");
      }
  
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/event/321");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // no volunteers => no matches
  });
  
test("GET /event/:eventId -> returns [] when event not found", async () => {
    // getAllEvents returns a different id than requested
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 999, // not the one we'll request
              name: "Other Event",
              event_description: "something else",
              location: "Austin, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-02-02",
              max_volunteers: 10,
            },
          ],
        };
      }
  
      // volunteers still present, but since event isn't found, it should short-circuit
      if (s.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 300,
              email: "v@x.com",
              first_name: "A",
              last_name: "B",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: true,
            },
          ],
        };
      }
      if (s.includes("from user_skills")) return { rows: [{ name: "Teamwork" }] };
      if (s.includes("from user_availability")) return { rows: [{ avail_date: "2099-02-02" }] };
  
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/event/123");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // covers the "event not found -> []" branch
  });
  
  test("POST /assign -> 500 when volunteer or event not found", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("create table if not exists volunteer_matches")) return {};
      // return NO volunteers to trigger not-found branch in assignVolunteerToEvent
      if (s.includes("from user_credentials uc")) return { rows: [] };
  
      // events exist but no volunteers means the check fails anyway
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 501,
              name: "Park Cleanup",
              event_description: "cleanup",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "low",
              date: "2099-01-01",
              max_volunteers: 5,
            },
          ],
        };
      }
      return { rows: [] };
    });
  
    const res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: 101, eventId: 501 });
  
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/volunteer or event not found/i);
  });
  
  test("GET /all -> volunteer name falls back to email when first/last empty", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("create table if not exists volunteer_matches")) return {};
  
      if (s.includes("from volunteer_matches")) {
        return {
          rows: [
            {
              id: 3,
              event_id: 700,
              volunteer_id: 701,
              match_score: 60,
              status: "assigned",
              assigned_date: new Date("2099-03-03"),
              notes: null,
            },
          ],
        };
      }
  
      if (s.includes("from user_credentials uc")) {
        // first/last empty -> router should use email for display name
        return {
          rows: [
            {
              id: 701,
              email: "fallback@name.com",
              first_name: "",
              last_name: "",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: true,
            },
          ],
        };
      }
      if (s.includes("from user_skills")) return { rows: [{ name: "Teamwork" }] };
      if (s.includes("from user_availability")) return { rows: [{ avail_date: "2099-03-04" }] };
  
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 700,
              name: "Booth Support",
              event_description: "fair booth",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-03-04",
              max_volunteers: 5,
            },
          ],
        };
      }
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/all");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].volunteer.name).toBe("fallback@name.com"); // hit fallback
  });
  
  test("GET /event/:eventId -> +5 preferences boost explicitly covered", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 910,
              name: "Beach Cleanup",
              event_description: "We will CLEANUP the beach",
              location: "Houston, TX",
              required_skills: "First Aid",
              urgency: "medium",
              date: "2099-06-01",
              max_volunteers: 2,
            },
          ],
        };
      }
  
      if (s.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 800,
              email: "pref@x.com",
              first_name: "Pref",
              last_name: "Boost",
              city: "Houston",
              state_code: "TX",
              preferences: ["cleanup"], // should match event name/description
              completed: true,
            },
          ],
        };
      }
  
      if (s.includes("from user_skills")) {
        expect(params[0]).toBe(800);
        return { rows: [{ name: "First Aid" }] };
      }
      if (s.includes("from user_availability")) {
        return { rows: [{ avail_date: "2099-06-01" }] };
      }
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/event/910");
    expect(res.status).toBe(200);
    // Baseline: 60 (skills) + 25 (availability) + 10 (location) + 5 (prefs) = 100 (capped by math/rounding)
    expect(res.body[0].matchScore).toBeGreaterThanOrEqual(90);
  });
test("GET /all -> [] when no matches rows (early return path)", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
      if (s.includes("create table if not exists volunteer_matches")) return {};
      if (s.includes("from volunteer_matches")) return { rows: [] }; // empty -> early return
      // Any other helper calls shouldn't run, but return safe defaults
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/all");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  
  test("GET /all -> event missing in enrichment (event: null branch)", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("create table if not exists volunteer_matches")) return {};
  
      if (s.includes("from volunteer_matches")) {
        return {
          rows: [
            {
              id: 10,
              event_id: 9999, // will not be returned by events
              volunteer_id: 5001,
              match_score: 72,
              status: "assigned",
              assigned_date: new Date("2099-07-01"),
              notes: null,
            },
          ],
        };
      }
  
      // volunteers present so volunteer is non-null
      if (s.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 5001,
              email: "v@x.com",
              first_name: "Vol",
              last_name: "Unteer",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: true,
            },
          ],
        };
      }
      if (s.includes("from user_skills")) return { rows: [{ name: "Teamwork" }] };
      if (s.includes("from user_availability")) return { rows: [{ avail_date: "2099-07-02" }] };
  
      // events do NOT include 9999 -> event becomes null in enrichment
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 7001,
              name: "Another Event",
              event_description: "desc",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-07-02",
              max_volunteers: 5,
            },
          ],
        };
      }
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/all");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].event).toBeNull(); // hit event-null branch
    expect(res.body[0].volunteer).toBeTruthy();
  });
  
  test("GET /volunteer/:id -> [] when volunteer not found or not completed", async () => {
    // Case A: volunteer not found
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
      if (s.includes("from user_credentials uc")) return { rows: [] }; // no volunteer with that id
      if (s.includes("from user_skills")) return { rows: [] };
      if (s.includes("from user_availability")) return { rows: [] };
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 1,
              name: "Any",
              event_description: "",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-01-01",
              max_volunteers: 1,
            },
          ],
        };
      }
      return { rows: [] };
    });
  
    let res = await request(app).get("/api/matching/volunteer/12345");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  
    // Case B: found but completed=false
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
      if (s.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 222,
              email: "incomplete@x.com",
              first_name: "Inc",
              last_name: "Complete",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: false, // not completed -> should early return []
            },
          ],
        };
      }
      if (s.includes("from user_skills")) return { rows: [] };
      if (s.includes("from user_availability")) return { rows: [] };
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return { rows: [] };
      }
      return { rows: [] };
    });
  
    res = await request(app).get("/api/matching/volunteer/222");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  
  test("PUT /:matchId/status -> 400 when status is non-string (e.g., number)", async () => {
    const res = await request(app)
      .put("/api/matching/42/status")
      .send({ status: 123 }); // present but not a string
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be a string/i);
  });
  
  test("GET /history/:volunteerId -> [] when no rows", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = (sql || "").toString().toLowerCase();
      if (s.includes("create table if not exists volunteer_matches")) return {};
      if (s.includes("from volunteer_matches vm where vm.volunteer_id")) {
        return { rows: [] }; // empty history
      }
      // events shouldn’t be called, but return safe default if it does
      return { rows: [] };
    });
  
    const res = await request(app).get("/api/matching/history/404");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  
  test("POST /assign -> 201 success when notes omitted (defaults to empty string)", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = (sql || "").toString().toLowerCase();
  
      if (s.includes("create table if not exists volunteer_matches")) return {};
  
      // volunteers
      if (s.includes("from user_credentials uc")) {
        return {
          rows: [
            {
              id: 101,
              email: "vol@x.com",
              first_name: "Vol",
              last_name: "Unteer",
              city: "Houston",
              state_code: "TX",
              preferences: [],
              completed: true,
            },
          ],
        };
      }
      if (s.includes("from user_skills")) return { rows: [{ name: "Teamwork" }] };
      if (s.includes("from user_availability")) return { rows: [{ avail_date: "2099-10-10" }] };
  
      // events
      if (s.includes("from events") && !s.includes("volunteer_matches")) {
        return {
          rows: [
            {
              id: 202,
              name: "Fair",
              event_description: "help booths",
              location: "Houston, TX",
              required_skills: "Teamwork",
              urgency: "low",
              date: "2099-10-10",
              max_volunteers: 10,
            },
          ],
        };
      }
  
      // existing assignment check -> none
      if (s.includes("select id from volunteer_matches")) {
        expect(params).toEqual([202, 101]);
        return { rowCount: 0, rows: [] };
      }
  
      // insert with default notes (empty string)
      if (s.includes("insert into volunteer_matches")) {
        // params: [eventId, volunteerId, matchScore, notes]
        expect(params[0]).toBe(202);
        expect(params[1]).toBe(101);
        expect(typeof params[2]).toBe("number");
        expect(params[3]).toBe(""); // defaulted notes
        return {
          rows: [
            {
              id: 77,
              event_id: 202,
              volunteer_id: 101,
              match_score: params[2],
              status: "assigned",
              assigned_date: new Date("2099-10-01"),
              notes: "",
            },
          ],
        };
      }
  
      return { rows: [] };
    });
  
    const res = await request(app)
      .post("/api/matching/assign")
      .send({ volunteerId: 101, eventId: 202 }); // notes omitted
    expect(res.status).toBe(201);
    expect(res.body.notes).toBe("");
  });
  