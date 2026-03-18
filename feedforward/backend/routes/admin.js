const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Food = require('../models/Food');
const Request = require('../models/Request');
const { protect, authorize } = require('../middleware/auth');

// GET /admin/stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalFood, totalRequests, completedRequests, activeFood, expiredFood] =
      await Promise.all([
        User.countDocuments(),
        Food.countDocuments(),
        Request.countDocuments(),
        Request.countDocuments({ status: 'completed' }),
        Food.countDocuments({ status: 'available' }),
        Food.countDocuments({ status: 'expired' }),
      ]);

    // Monthly data for charts (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyFoods = await Food.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyRequests = await Request.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers,
      totalFood,
      totalRequests,
      completedRequests,
      activeFood,
      expiredFood,
      monthlyFoods,
      monthlyRequests,
      roleDistribution,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /admin/users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /admin/user/:id
router.delete('/user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
