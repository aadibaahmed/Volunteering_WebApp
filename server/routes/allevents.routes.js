import express from 'express';
import { getAllEvents } from '../events/all_events.js';

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

export default router;
