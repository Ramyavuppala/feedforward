const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getProvidersAnalytics,
  getSeekersAnalytics,
  getFoodAnalytics,
  getUsers,
  deleteUser,
} = require('../controllers/adminController');

// GET /admin/stats
router.get('/stats', protect, authorize('admin'), getStats);

// Analytics
router.get('/providers-analytics', protect, authorize('admin'), getProvidersAnalytics);
router.get('/seekers-analytics', protect, authorize('admin'), getSeekersAnalytics);
router.get('/food-analytics', protect, authorize('admin'), getFoodAnalytics);

// GET /admin/users
router.get('/users', protect, authorize('admin'), getUsers);

// DELETE /admin/user/:id
router.delete('/user/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
