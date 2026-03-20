const User = require('../models/User');

async function updateUserLocation(req, res) {
  try {
    const { lat, lng } = req.body;
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers' });
    }
    if (nextLat < -90 || nextLat > 90 || nextLng < -180 || nextLng > 180) {
      return res.status(400).json({ message: 'lat/lng out of range' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { lastLat: nextLat, lastLng: nextLng },
      { new: true }
    ).select('-password');

    res.json({ message: 'Location saved', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getTrustScore(req, res) {
  try {
    const user = await User.findById(req.user._id).select('trustScore role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ trustScore: user.trustScore || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { updateUserLocation, getTrustScore };

