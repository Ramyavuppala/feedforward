const express = require('express');
const { protect } = require('../middleware/auth');
const { updateUserLocation, getTrustScore } = require('../controllers/userController');

const router = express.Router();

// PUT /user/location — save latest seeker location for nearby notifications/matching
router.put('/location', protect, updateUserLocation);

// GET /user/trust-score — fetch the logged-in user's trust score
router.get('/trust-score', protect, getTrustScore);

module.exports = router;

