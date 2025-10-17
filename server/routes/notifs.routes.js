import express from 'express';
import { getNotifications } from '../notifications/get_notifs.js';

const router = express.Router();

router.get('/notifications', (req, res) => {
  const notifications = getNotifications();
  res.status(200).json(notifications);
});

export default router;
