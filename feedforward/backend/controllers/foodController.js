const Food = require('../models/Food');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { haversineKm } = require('../utils/haversine');

function parseLegacyQuantity(quantity) {
  if (typeof quantity !== 'string') return null;
  const trimmed = quantity.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!match) return null;
  const totalQuantity = Number(match[1]);
  const unit = (match[2] || '').trim();
  if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) return null;
  if (!unit) return null;
  return { totalQuantity, unit };
}

async function addFood(req, res) {
  try {
    const {
      foodName,
      quantity,
      totalQuantity: rawTotalQuantity,
      unit: rawUnit,
      expiryTime,
      location,
      lat,
      lng,
      description,
    } = req.body;

    let totalQuantity;
    let unit;
    if (rawTotalQuantity !== undefined || rawUnit !== undefined) {
      totalQuantity = Number(rawTotalQuantity);
      unit = typeof rawUnit === 'string' ? rawUnit.trim() : '';
      if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
        return res.status(400).json({ message: 'totalQuantity must be a positive number' });
      }
      if (!unit) return res.status(400).json({ message: 'unit is required' });
    } else {
      const parsed = parseLegacyQuantity(quantity);
      if (!parsed) {
        return res.status(400).json({ message: 'Provide totalQuantity + unit (or quantity like "5 kg")' });
      }
      totalQuantity = parsed.totalQuantity;
      unit = parsed.unit;
    }

    const food = await Food.create({
      foodName,
      quantity: quantity || `${totalQuantity} ${unit}`.trim(),
      totalQuantity,
      remainingQuantity: totalQuantity,
      unit,
      expiryTime,
      location,
      lat,
      lng,
      description,
      providerId: req.user._id,
    });

    await food.populate('providerId', 'name email');
    req.io.emit('foodAdded', food);
    req.io.emit('quantityUpdated', {
      foodId: food._id,
      totalQuantity: food.totalQuantity,
      remainingQuantity: food.remainingQuantity,
      unit: food.unit,
      status: food.status,
    });

    // Smart notifications (seekers within ~radius)
    // Note: This uses each seeker's last saved location from `User.lastLat/lastLng`.
    // Geolocation must be stored by the frontend so we can later do distance-based matching.
    if (food.lat != null && food.lng != null) {
      const SMART_RADIUS_KM = 8; // within 5–10km (pick a safe middle)
      const radiusKm = SMART_RADIUS_KM;

      const foodExpiryMs = new Date(food.expiryTime).getTime();
      const timeRemainingMs = foodExpiryMs - Date.now(); // timeRemaining = expiryTime - currentTime
      const isUrgent = timeRemainingMs <= 60 * 60 * 1000; // < 1 hour

      const message = isUrgent ? 'Hurry! Food expiring soon' : 'Food available near you!';

      const latRad = (food.lat * Math.PI) / 180;
      // Rough bounding box to reduce candidates (then we do exact haversine in JS).
      const deltaLat = radiusKm / 111;
      const deltaLng = radiusKm / (111 * Math.cos(latRad) || 1);

      const seekerCandidates = await User.find({
        role: 'seeker',
        lastLat: { $ne: null },
        lastLng: { $ne: null },
        lastLat: { $gte: food.lat - deltaLat, $lte: food.lat + deltaLat },
        lastLng: { $gte: food.lng - deltaLng, $lte: food.lng + deltaLng },
      }).select('_id lastLat lastLng');

      // Avoid heavy loops: notify only a bounded number of nearby seekers.
      const MAX_NOTIFY = 50;

      for (const seeker of seekerCandidates.slice(0, MAX_NOTIFY)) {
        const distanceKm = haversineKm(food.lat, food.lng, seeker.lastLat, seeker.lastLng);
        if (!Number.isFinite(distanceKm)) continue;
        if (distanceKm > radiusKm) continue;

        const notif = await Notification.create({
          userId: seeker._id,
          message,
          type: 'smart_food',
          refId: food._id,
        });

        // Emit to the user's socket room (client joins room with `socket.emit('join', user._id)`).
        req.io.to(seeker._id.toString()).emit('smartNotification', { notification: notif });
      }
    }

    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAllFood(req, res) {
  try {
    const foods = await Food.find({ status: 'available', remainingQuantity: { $gt: 0 } })
      .populate('providerId', 'name email')
      .sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getProviderFood(req, res) {
  try {
    const foods = await Food.find({ providerId: req.user._id }).sort('-createdAt');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateFoodStatus(req, res) {
  try {
    const food = await Food.findOne({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    food.status = req.body.status || food.status;
    await food.save();
    req.io.emit('foodUpdated', food);
    req.io.emit('quantityUpdated', {
      foodId: food._id,
      totalQuantity: food.totalQuantity,
      remainingQuantity: food.remainingQuantity,
      unit: food.unit,
      status: food.status,
    });
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteFood(req, res) {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, providerId: req.user._id });
    if (!food) return res.status(404).json({ message: 'Food not found' });
    req.io.emit('foodDeleted', { _id: req.params.id });
    res.json({ message: 'Food deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * GET /food/recommended
 *
 * Smart matching prioritization for seekers:
 * 1) distance (nearest first)
 * 2) expiry time (earliest expiry first)
 * 3) available quantity (sufficient quantity preferred)
 *
 * priorityScore:
 *   (w1 / distance) + (w2 / timeRemaining) + (w3 * remainingQuantity)
 *
 * We normalize/clamp intermediate values to avoid extreme bias (e.g. distance=0).
 */
async function getRecommendedFood(req, res) {
  try {
    const userLat = Number(req.query.lat);
    const userLng = Number(req.query.lng);
    const limit = Number(req.query.limit) || 5;

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return res.status(400).json({ message: 'Provide lat and lng query params' });
    }
    if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return res.status(400).json({ message: 'lat/lng out of range' });
    }

    const now = Date.now(); // currentTime
    const radiusKm = Number(req.query.radiusKm) || 25; // prefilter for performance

    const latRad = (userLat * Math.PI) / 180;
    const deltaLat = radiusKm / 111;
    const deltaLng = radiusKm / (111 * Math.cos(latRad) || 1);

    const candidates = await Food.find({
      status: 'available',
      remainingQuantity: { $gt: 0 },
      expiryTime: { $gt: new Date(now) },
      // Use a bounding box for performance (then score with exact haversine below)
      lat: { $ne: null, $gte: userLat - deltaLat, $lte: userLat + deltaLat },
      lng: { $ne: null, $gte: userLng - deltaLng, $lte: userLng + deltaLng },
    })
      .populate('providerId', 'name email')
      .lean();

    // Normalize quantity using the maximum in this candidate set (reduces extreme bias).
    const maxRemaining = Math.max(
      1,
      ...candidates.map((f) => (Number.isFinite(f.remainingQuantity) ? f.remainingQuantity : 0))
    );

    const w1 = 0.5; // distance weight
    const w2 = 0.3; // expiry-time weight
    const w3 = 0.2; // quantity weight

    const scored = candidates.map((food) => {
      const distanceKm = haversineKm(userLat, userLng, food.lat, food.lng);
      if (!Number.isFinite(distanceKm)) return null;

      // timeRemaining = expiryTime - currentTime
      const timeRemainingMs = new Date(food.expiryTime).getTime() - now;
      const timeRemainingHours = timeRemainingMs / (1000 * 60 * 60);

      // Clamp values to avoid infinities / extreme scores.
      const distanceClamped = Math.min(Math.max(distanceKm, 0.1), 50); // km
      const timeHoursClamped = Math.min(Math.max(timeRemainingHours, 0.05), 48); // hours

      // remainingQuantity normalized to 0..1 (derived from remainingQuantity)
      const remainingQuantityNormalized = food.remainingQuantity / maxRemaining;

      const priorityScore =
        w1 / distanceClamped + w2 / timeHoursClamped + w3 * remainingQuantityNormalized;

      return {
        ...food,
        distanceKm,
        timeRemainingMs,
        priorityScore,
      };
    });

    const cleaned = scored.filter(Boolean);
    cleaned.sort((a, b) => b.priorityScore - a.priorityScore);
    res.json(cleaned.slice(0, limit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  addFood,
  getAllFood,
  getProviderFood,
  updateFoodStatus,
  deleteFood,
  getRecommendedFood,
};

