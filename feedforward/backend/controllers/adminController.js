const User = require('../models/User');
const Food = require('../models/Food');
const Request = require('../models/Request');

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

const getLastNMonths = (n) => {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
};

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

async function getStats(req, res) {
  try {
    const [
      totalUsers,
      totalProviders,
      totalSeekers,
      totalFoodListings,
      totalRequests,
      completedRequests,
      activeFood,
      expiredFood,
      completedFood,
      quantities,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'seeker' }),
      Food.countDocuments(),
      Request.countDocuments(),
      Request.countDocuments({ status: 'completed' }),
      Food.countDocuments({ status: 'available' }),
      Food.countDocuments({ status: 'expired' }),
      Food.countDocuments({ status: 'completed' }),
      Food.aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$totalQuantity' },
            remainingQuantity: { $sum: '$remainingQuantity' },
          },
        },
      ]),
    ]);

    const distributedQuantity =
      (quantities?.[0]?.totalQuantity || 0) - (quantities?.[0]?.remainingQuantity || 0);
    const remainingQuantity = quantities?.[0]?.remainingQuantity || 0;

    const sixMonthsAgo = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 5)));

    const [monthlyFoods, monthlyRequests, roleDistribution] = await Promise.all([
      Food.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            totalQuantity: { $sum: '$totalQuantity' },
            distributedQuantity: {
              $sum: { $subtract: ['$totalQuantity', '$remainingQuantity'] },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Request.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            fulfilled: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            requestedQuantity: { $sum: '$requestedQuantity' },
            fulfilledQuantity: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$requestedQuantity', 0] },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    res.json({
      totalUsers,
      totalProviders,
      totalSeekers,
      totalFoodListings,
      totalRequests,
      completedRequests,
      activeFood,
      expiredFood,
      completedFood,
      distributedQuantity,
      remainingQuantity,
      monthlyFoods,
      monthlyRequests,
      roleDistribution,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getUsers(req, res) {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getProvidersAnalytics(req, res) {
  try {
    const [providers, foodByProvider, reqByProvider] = await Promise.all([
      User.find({ role: 'provider' }).select('name email').lean(),
      Food.aggregate([
        {
          $group: {
            _id: '$providerId',
            foodListings: { $sum: 1 },
            totalQuantity: { $sum: '$totalQuantity' },
            remainingQuantity: { $sum: '$remainingQuantity' },
            distributedQuantity: {
              $sum: { $subtract: ['$totalQuantity', '$remainingQuantity'] },
            },
          },
        },
      ]),
      Request.aggregate([
        {
          $group: {
            _id: '$providerId',
            totalRequests: { $sum: 1 },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            fulfilledQuantity: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$requestedQuantity', 0] },
            },
          },
        },
      ]),
    ]);

    const foodMap = new Map(foodByProvider.map((d) => [String(d._id), d]));
    const reqMap = new Map(reqByProvider.map((d) => [String(d._id), d]));

    const rows = providers.map((p) => {
      const f = foodMap.get(String(p._id)) || {};
      const r = reqMap.get(String(p._id)) || {};
      const decisions = (r.accepted || 0) + (r.rejected || 0);
      const acceptanceRate = decisions ? Math.round(((r.accepted || 0) / decisions) * 100) : 0;
      return {
        providerId: p._id,
        name: p.name,
        email: p.email,
        foodListings: f.foodListings || 0,
        totalQuantity: f.totalQuantity || 0,
        distributedQuantity: f.distributedQuantity || 0,
        remainingQuantity: f.remainingQuantity || 0,
        totalRequests: r.totalRequests || 0,
        accepted: r.accepted || 0,
        rejected: r.rejected || 0,
        completed: r.completed || 0,
        fulfilledQuantity: r.fulfilledQuantity || 0,
        acceptanceRate,
      };
    });

    rows.sort((a, b) => b.distributedQuantity - a.distributedQuantity);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getSeekersAnalytics(req, res) {
  try {
    const [seekers, reqBySeeker] = await Promise.all([
      User.find({ role: 'seeker' }).select('name email').lean(),
      Request.aggregate([
        {
          $group: {
            _id: '$seekerId',
            totalRequests: { $sum: 1 },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            requestedQuantity: { $sum: '$requestedQuantity' },
            receivedQuantity: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$requestedQuantity', 0] },
            },
          },
        },
      ]),
    ]);

    const reqMap = new Map(reqBySeeker.map((d) => [String(d._id), d]));

    const rows = seekers.map((s) => {
      const r = reqMap.get(String(s._id)) || {};
      const outcomes = (r.completed || 0) + (r.rejected || 0);
      const successRate = outcomes ? Math.round(((r.completed || 0) / outcomes) * 100) : 0;
      return {
        seekerId: s._id,
        name: s.name,
        email: s.email,
        totalRequests: r.totalRequests || 0,
        accepted: r.accepted || 0,
        rejected: r.rejected || 0,
        completed: r.completed || 0,
        requestedQuantity: r.requestedQuantity || 0,
        receivedQuantity: r.receivedQuantity || 0,
        successRate,
      };
    });

    rows.sort((a, b) => b.receivedQuantity - a.receivedQuantity);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getFoodAnalytics(req, res) {
  try {
    const [counts, quantities, requests] = await Promise.all([
      Food.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Food.aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$totalQuantity' },
            remainingQuantity: { $sum: '$remainingQuantity' },
            distributedQuantity: {
              $sum: { $subtract: ['$totalQuantity', '$remainingQuantity'] },
            },
          },
        },
      ]),
      Request.aggregate([
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            fulfilledRequests: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            requestedQuantity: { $sum: '$requestedQuantity' },
            fulfilledQuantity: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$requestedQuantity', 0] },
            },
          },
        },
      ]),
    ]);

    const totals = quantities?.[0] || { totalQuantity: 0, remainingQuantity: 0, distributedQuantity: 0 };
    const reqTotals = requests?.[0] || { totalRequests: 0, fulfilledRequests: 0, requestedQuantity: 0, fulfilledQuantity: 0 };

    // Time series (last 6 months) for charts
    const months = getLastNMonths(6);
    const from = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 5)));
    const [foodsSeriesRaw, requestsSeriesRaw] = await Promise.all([
      Food.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            foodAdded: { $sum: 1 },
            quantityAdded: { $sum: '$totalQuantity' },
            quantityDistributed: { $sum: { $subtract: ['$totalQuantity', '$remainingQuantity'] } },
          },
        },
      ]),
      Request.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            requests: { $sum: 1 },
            fulfilled: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const foodsMap = new Map(
      foodsSeriesRaw.map((d) => [monthKey(d._id.year, d._id.month), d])
    );
    const reqMap = new Map(
      requestsSeriesRaw.map((d) => [monthKey(d._id.year, d._id.month), d])
    );

    const timeSeries = months.map((m) => {
      const key = monthKey(m.year, m.month);
      const f = foodsMap.get(key) || {};
      const r = reqMap.get(key) || {};
      return {
        year: m.year,
        month: m.month,
        foodAdded: f.foodAdded || 0,
        quantityAdded: f.quantityAdded || 0,
        quantityDistributed: f.quantityDistributed || 0,
        requests: r.requests || 0,
        fulfilled: r.fulfilled || 0,
      };
    });

    res.json({
      statusCounts: counts,
      totals,
      requestTotals: reqTotals,
      timeSeries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getStats,
  getUsers,
  deleteUser,
  getProvidersAnalytics,
  getSeekersAnalytics,
  getFoodAnalytics,
};

