import express from 'express';
import { getNotifications } from '../notifications/get_notifs.js'; // MUST include .js extension

const router = express.Router();

router.get('/notifications', (req, res) => {
  const notifications = getNotifications();

  console.log(notifications)
  res.status(200).json(notifications);
});

export default router;
