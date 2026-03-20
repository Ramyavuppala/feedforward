const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  addFood,
  getAllFood,
  getProviderFood,
  updateFoodStatus,
  deleteFood,
  getRecommendedFood,
} = require('../controllers/foodController');

// POST /food/add
router.post('/add', protect, authorize('provider'), addFood);

// GET /food/all — available food for seekers
router.get('/all', protect, getAllFood);

// GET /food/recommended — smart matching for seekers
// Expects `lat` + `lng` query params from the seeker.
router.get('/recommended', protect, getRecommendedFood);

// GET /food/provider — provider's own listings
router.get('/provider', protect, authorize('provider'), getProviderFood);

// PUT /food/status/:id — update status (mark delivered)
router.put('/status/:id', protect, authorize('provider'), updateFoodStatus);

// DELETE /food/:id
router.delete('/:id', protect, authorize('provider'), deleteFood);

module.exports = router;
