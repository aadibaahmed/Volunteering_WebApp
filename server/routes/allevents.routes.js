import express from 'express';
import { getAllEvents } from '../events/all_events.js';
import { event_by_id } from '../events/event_by_id.js';
import {insert_volunteer} from '../events/insert_volunteer.js'

const router = express.Router();

router.get('/allevents', async (req, res) => {
  try {
    const events = await getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

router.get("/events/:id", event_by_id);


router.post("/events/signup/:id", insert_volunteer);

export default router;
