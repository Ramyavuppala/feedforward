const mongoose = require('mongoose');
const VolunteerTask = require('../models/VolunteerTask');
const Request = require('../models/Request');
const Food = require('../models/Food');
const Notification = require('../models/Notification');
const { adjustTrustScore, applyTrustForRequestStatus } = require('../utils/trustScore');

function isExpired(expiryTime, nowMs = Date.now()) {
  const ms = new Date(expiryTime).getTime();
  return !Number.isFinite(ms) || ms <= nowMs;
}

function canTransition(current, requested) {
  if (current === 'accepted' && requested === 'picked') return true;
  if (current === 'picked' && requested === 'delivered') return true;
  return false;
}

/**
 * GET /volunteer/tasks/available
 *
 * Returns tasks that still need a volunteer:
 * - volunteerId is null
 * - status is "pending"
 */
async function getAvailableTasks(req, res) {
  try {
    const tasks = await VolunteerTask.find({
      volunteerId: null,
      status: 'pending',
    })
      .populate('foodId', 'foodName location expiryTime remainingQuantity unit')
      .populate('seekerId', 'name email lastLat lastLng')
      .populate('providerId', 'name email')
      .sort('-createdAt');

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * GET /volunteer/tasks/my
 *
 * Returns tasks assigned to the currently logged-in volunteer.
 */
async function getMyTasks(req, res) {
  try {
    const tasks = await VolunteerTask.find({ volunteerId: req.user._id })
      .populate('foodId', 'foodName location expiryTime remainingQuantity unit')
      .populate('seekerId', 'name email lastLat lastLng')
      .populate('providerId', 'name email')
      .sort('-createdAt');

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * POST /volunteer/task/:id/accept
 *
 * A volunteer claims a pending task.
 * Rules:
 * - volunteerId must be null
 * - status must be "pending"
 * - only one volunteer can accept a given task
 */
async function acceptTask(req, res) {
  try {
    const task = await VolunteerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.volunteerId) {
      return res.status(400).json({ message: 'Task already accepted by a volunteer' });
    }
    if (task.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending tasks can be accepted' });
    }

    const food = await Food.findById(task.foodId);
    if (!food) return res.status(404).json({ message: 'Food not found for this task' });
    if (isExpired(food.expiryTime)) {
      return res.status(400).json({ message: 'Food has already expired' });
    }

    task.volunteerId = req.user._id;
    task.status = 'accepted';
    await task.save();

    const populated = await VolunteerTask.findById(task._id)
      .populate('foodId', 'foodName location expiryTime remainingQuantity unit')
      .populate('seekerId', 'name email lastLat lastLng')
      .populate('providerId', 'name email');

    // Notify clients that this task is no longer available and has been accepted.
    req.io.emit('taskAccepted', populated);
    req.io.emit('taskUpdated', populated);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * PUT /volunteer/task/:id/status
 *
 * Status flow:
 *   accepted -> picked -> delivered
 *
 * When status becomes "delivered":
 * - The associated Request moves to "completed"
 * - Trust scores are updated:
 *   volunteer +10, provider +10, seeker +5 (via trustScore helper)
 * - A "deliveryCompleted" socket event is emitted
 */
async function updateTaskStatus(req, res) {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ message: 'status is required' });
    if (!['picked', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await VolunteerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.volunteerId || String(task.volunteerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    if (task.status === status) {
      return res.status(400).json({ message: 'Task already in this status' });
    }
    if (!canTransition(task.status, status)) {
      return res.status(400).json({ message: `Invalid status transition from ${task.status} -> ${status}` });
    }

    const food = await Food.findById(task.foodId);
    if (!food) return res.status(404).json({ message: 'Food not found for this task' });

    // Prevent volunteers from moving forward with already-expired food.
    if (isExpired(food.expiryTime)) {
      return res.status(400).json({ message: 'Food has already expired' });
    }

    // Non-terminal transitions (accepted -> picked)
    if (status === 'picked') {
      task.status = 'picked';
      await task.save();

      const updated = await VolunteerTask.findById(task._id)
        .populate('foodId', 'foodName location expiryTime remainingQuantity unit')
        .populate('seekerId', 'name email lastLat lastLng')
        .populate('providerId', 'name email');

      req.io.emit('taskUpdated', updated);
      return res.json(updated);
    }

    // delivered: update task + request + trust scores
    const request = await Request.findOne({
      foodId: task.foodId,
      providerId: task.providerId,
      seekerId: task.seekerId,
      status: 'accepted',
    });
    if (!request) {
      return res.status(400).json({ message: 'Associated request is not in an accepted state' });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        task.status = 'delivered';
        await task.save({ session });

        request.status = 'completed';
        await request.save({ session });
      });
    } finally {
      session.endSession();
    }

    // Notify seeker about successful delivery.
    const message = `"${food.foodName}" has been delivered to you!`;
    const notif = await Notification.create({
      userId: request.seekerId,
      message,
      type: 'completed',
      refId: request._id,
    });

    req.io.to(request.seekerId.toString()).emit('requestUpdated', { request, notification: notif });
    req.io.to(request.providerId.toString()).emit('requestUpdated', { request, notification: notif });

    // Trust scores:
    // - Volunteers: +10 for completed delivery
    // - Providers/Seekers: handled via helper for completed requests
    await adjustTrustScore(req.user._id, 10);
    await applyTrustForRequestStatus({ request, status: 'completed' });

    const updatedTask = await VolunteerTask.findById(task._id)
      .populate('foodId', 'foodName location expiryTime remainingQuantity unit')
      .populate('seekerId', 'name email lastLat lastLng')
      .populate('providerId', 'name email');

    req.io.emit('taskUpdated', updatedTask);
    req.io.emit('deliveryCompleted', { task: updatedTask, requestId: request._id });

    return res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getAvailableTasks,
  getMyTasks,
  acceptTask,
  updateTaskStatus,
};

