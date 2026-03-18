const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Food = require('../models/Food');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// POST /request — seeker requests food
router.post('/', protect, authorize('seeker'), async (req, res) => {
  try {
    const { foodId, message } = req.body;
    const food = await Food.findById(foodId);
    if (!food || food.status !== 'available')
      return res.status(400).json({ message: 'Food not available' });

    const existing = await Request.findOne({ foodId, seekerId: req.user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Already requested' });

    const request = await Request.create({
      foodId,
      seekerId: req.user._id,
      providerId: food.providerId,
      message,
    });

    food.status = 'requested';
    await food.save();

    // Notify provider
    const notif = await Notification.create({
      userId: food.providerId,
      message: `New request for "${food.foodName}" from ${req.user.name}`,
      type: 'request',
      refId: request._id,
    });
    req.io.to(food.providerId.toString()).emit('foodRequested', { request, notification: notif });

    const populated = await request.populate([
      { path: 'foodId' },
      { path: 'seekerId', select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /request/my — seeker's own requests
router.get('/my', protect, authorize('seeker'), async (req, res) => {
  try {
    const requests = await Request.find({ seekerId: req.user._id })
      .populate('foodId')
      .populate('providerId', 'name email')
      .sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /request/provider — provider sees requests for their food
router.get('/provider', protect, authorize('provider'), async (req, res) => {
  try {
    const requests = await Request.find({ providerId: req.user._id })
      .populate('foodId')
      .populate('seekerId', 'name email')
      .sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /request/:id — accept/reject/complete
router.put('/:id', protect, authorize('provider'), async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findOne({ _id: req.params.id, providerId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    await request.save();

    const food = await Food.findById(request.foodId);
    if (food) {
      if (status === 'accepted') food.status = 'accepted';
      else if (status === 'rejected') food.status = 'available';
      else if (status === 'completed') food.status = 'delivered';
      await food.save();
    }

    // Notify seeker
    const messages = {
      accepted: `Your request for "${food?.foodName}" was accepted!`,
      rejected: `Your request for "${food?.foodName}" was declined.`,
      completed: `"${food?.foodName}" has been delivered to you!`,
    };
    const notif = await Notification.create({
      userId: request.seekerId,
      message: messages[status] || `Request status updated to ${status}`,
      type: status,
      refId: request._id,
    });
    req.io.to(request.seekerId.toString()).emit('requestUpdated', { request, notification: notif });

    const populated = await request.populate([
      { path: 'foodId' },
      { path: 'seekerId', select: 'name email' },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
