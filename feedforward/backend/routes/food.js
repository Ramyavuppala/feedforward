const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// POST /food/add
router.post('/add', protect, authorize('provider'), async (req, res) => {
  try {
    const { foodName, quantity, expiryTime, location, lat, lng, description } = req.body;
    const food = await Food.create({
      foodName, quantity, expiryTime, location, lat, lng, description,
      providerId: req.user._id,
    });
    await food.populate('providerId', 'name email');
    req.io.emit('foodAdded', food);
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /food/all — available food for seekers
router.get('/all', protect, async (req, res) => {
  try {
    const foods = await Food.find({ status: 'available' })
      .populate('providerId', 'name email')
      .sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /food/provider — provider's own listings
router.get('/provider', protect, authorize('provider'), async (req, res) => {
  try {
    const foods = await Food.find({ providerId: req.user._id }).sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /food/status/:id — update status (mark delivered)
router.put('/status/:id', protect, authorize('provider'), async (req, res) => {
  try {
    const food = await Food.findOne({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    food.status = req.body.status || food.status;
    await food.save();
    req.io.emit('foodUpdated', food);
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /food/:id
router.delete('/:id', protect, authorize('provider'), async (req, res) => {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    req.io.emit('foodDeleted', { _id: req.params.id });
    res.json({ message: 'Food deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
