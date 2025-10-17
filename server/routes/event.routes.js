import express from "express";

const router = express.Router();

let events = [];
router.post("/create", (req, res) => {
  const { eventName, description, location, skills, urgency, date, startTime, endTime } = req.body;

  if (!eventName || !description || !location || !skills || !urgency || !date || !startTime || !endTime) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newEvent = {
    id: events.length + 1,
    eventName,
    description,
    location,
    skills,
    urgency,
    date,
    startTime,
    endTime,
  };

  events.push(newEvent);
  res.status(201).json({ message: "Event created successfully!", event: newEvent });
});


router.get("/", (req, res) => {
  res.json(events);
});

//Update an existing event
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { eventName, description, location, skills, urgency, date, startTime, endTime } = req.body;

  const eventIndex = events.findIndex(e => e.id == id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: "Event not found" });
  }

  //Update event fields
  events[eventIndex] = {
    ...events[eventIndex],
    eventName,
    description,
    location,
    skills,
    urgency,
    date,
    startTime,
    endTime
  };

  res.json({ message: "Event updated successfully", event: events[eventIndex] });
});

// Delete an event
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const index = events.findIndex(e => e.id == id);
  if (index === -1) {
    return res.status(404).json({ message: "Event not found" });
  }
  const deleted = events.splice(index, 1);
  res.json({ message: "Event deleted successfully", deleted });
});

export default router;
