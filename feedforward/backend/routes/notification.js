const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

// GET /notification
router.get('/', protect, getNotifications);

// PUT /notification/read/:id
router.put('/read/:id', protect, markRead);

// PUT /notification/read-all
router.put('/read-all', protect, markAllRead);

module.exports = router;
