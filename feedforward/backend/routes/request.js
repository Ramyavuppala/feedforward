const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Request = require('../models/Request');
const Food = require('../models/Food');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// POST /request — seeker requests food
router.post('/', protect, authorize('seeker'), async (req, res) => {
  try {
    const { foodId, message, requestedQuantity: rawRequestedQuantity } = req.body;
    const requestedQuantity = Number(rawRequestedQuantity);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ message: 'requestedQuantity must be a positive number' });
    }

    const food = await Food.findById(foodId);
    if (!food || food.status !== 'available' || food.remainingQuantity <= 0)
      return res.status(400).json({ message: 'Food not available' });
    if (requestedQuantity > food.remainingQuantity) {
      return res.status(400).json({ message: `Only ${food.remainingQuantity}${food.unit ? ` ${food.unit}` : ''} left` });
    }

    const existing = await Request.findOne({ foodId, seekerId: req.user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Already requested' });

    const request = await Request.create({
      foodId,
      seekerId: req.user._id,
      providerId: food.providerId,
      requestedQuantity,
      message,
    });

    // Notify provider
    const notif = await Notification.create({
      userId: food.providerId,
      message: `New request for ${requestedQuantity} ${food.unit} of "${food.foodName}" from ${req.user.name}`,
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

    let food = await Food.findById(request.foodId);

    if (status === 'accepted') {
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending requests can be accepted' });
      }
      if (!food || food.status !== 'available') {
        return res.status(400).json({ message: 'Food not available' });
      }

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const updatedRequest = await Request.findOneAndUpdate(
            { _id: request._id, providerId: req.user._id, status: 'pending' },
            { $set: { status: 'accepted' } },
            { new: true, session }
          );
          if (!updatedRequest) throw new Error('Request already updated');

          const updatedFood = await Food.findOneAndUpdate(
            {
              _id: request.foodId,
              status: 'available',
              remainingQuantity: { $gte: request.requestedQuantity },
            },
            { $inc: { remainingQuantity: -request.requestedQuantity } },
            { new: true, session }
          );
          if (!updatedFood) {
            // Trigger rollback
            throw new Error('Insufficient remaining quantity');
          }

          if (updatedFood.remainingQuantity === 0) {
            updatedFood.status = 'completed';
          } else {
            updatedFood.status = 'available';
          }
          await updatedFood.save({ session });

          request.status = updatedRequest.status;
          food = updatedFood;
        });
      } catch (e) {
        if (e.message === 'Insufficient remaining quantity') {
          return res.status(400).json({ message: 'Requested quantity exceeds remaining quantity' });
        }
        if (e.message === 'Request already updated') {
          return res.status(400).json({ message: 'Request already processed' });
        }
        throw e;
      } finally {
        session.endSession();
      }
    } else if (status === 'rejected') {
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending requests can be rejected' });
      }
      request.status = 'rejected';
      await request.save();
      // Food remains available unless already completed/expired.
    } else if (status === 'completed') {
      if (request.status !== 'accepted') {
        return res.status(400).json({ message: 'Only accepted requests can be completed' });
      }
      request.status = 'completed';
      await request.save();
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Notify seeker
    const messages = {
      accepted: `Your request for ${request.requestedQuantity} ${food?.unit || ''} of "${food?.foodName}" was accepted!`,
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

    if (food && (status === 'accepted')) {
      req.io.emit('foodUpdated', food);
    }

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
