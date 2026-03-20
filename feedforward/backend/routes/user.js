const express = require('express');
const { protect } = require('../middleware/auth');
const { updateUserLocation } = require('../controllers/userController');

const router = express.Router();

// PUT /user/location — save latest seeker location for nearby notifications/matching
router.put('/location', protect, updateUserLocation);

module.exports = router;

