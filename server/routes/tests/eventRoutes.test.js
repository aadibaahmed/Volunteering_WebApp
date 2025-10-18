import request from "supertest";
import app from "../../server.js"; 

describe("Event Routes", () => {
  test("GET /api/events should return status 200", async () => {
    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(200);
  });

  test("POST /api/events/create should create a new event", async () => {
    const newEvent = {
      eventName: "Community Clean-Up",
      description: "Help clean up the park!",
      location: "Houston",
      skills: "Cleaning",
      urgency: "High",
      date: "2025-10-25",
      startTime: "10:00 AM",
      endTime: "12:00 PM"
    };

    const res = await request(app)
      .post("/api/events/create")
      .send(newEvent);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("event");
    expect(res.body.event).toHaveProperty("eventName", "Community Clean-Up");
  });

  test("DELETE /api/events/:id should delete an event", async () => {
    const newEvent = {
      eventName: "Tree Planting",
      description: "Plant trees in the community park",
      location: "Houston",
      skills: "Gardening",
      urgency: "Medium",
      date: "2025-10-30",
      startTime: "9:00 AM",
      endTime: "11:00 AM"
    };

    const createRes = await request(app)
      .post("/api/events/create")
      .send(newEvent);

    const createdEventId = createRes.body.event.id;

    const deleteRes = await request(app).delete(`/api/events/${createdEventId}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toHaveProperty("message", "Event deleted successfully");
  });

  test("POST /api/events/create should return 400 if missing fields", async () => {
    const incompleteEvent = { eventName: "Incomplete Event" }; // Missing fields
    const res = await request(app)
      .post("/api/events/create")
      .send(incompleteEvent);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Missing required fields");
  });

  test("PUT /api/events/:id should update an existing event", async () => {
    const newEvent = {
      eventName: "Park Cleanup",
      description: "Clean up the local park",
      location: "Houston",
      skills: "Teamwork",
      urgency: "Medium",
      date: "2025-11-01",
      startTime: "9:00 AM",
      endTime: "12:00 PM"
    };

    const createRes = await request(app)
      .post("/api/events/create")
      .send(newEvent);

    const eventId = createRes.body.event.id;
    const updatedEvent = { ...newEvent, eventName: "Park Cleanup Updated" };

    const updateRes = await request(app)
      .put(`/api/events/${eventId}`)
      .send(updatedEvent);

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.event.eventName).toBe("Park Cleanup Updated");
  });
});
