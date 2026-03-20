const User = require('../models/User');

/**
 * Apply trust score deltas while keeping the value non-negative.
 *
 * Trust score logic (per requirements):
 * - Providers: +10 on completed requests, -5 on rejected requests
 * - Seekers: +5 on completed requests, -3 on cancellations (modeled here as provider rejections)
 * - Volunteers: +10 on successful deliveries, -5 on incomplete deliveries
 */
async function adjustTrustScore(userId, delta) {
  if (!userId) return null;
  const safeDelta = Number(delta);
  if (!Number.isFinite(safeDelta) || safeDelta === 0) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  const current = Number.isFinite(user.trustScore) ? user.trustScore : 0;
  const next = Math.max(0, current + safeDelta); // never allow negative reputation
  user.trustScore = next;
  await user.save();
  return next;
}

/**
 * Apply trust score changes triggered by request lifecycle events.
 *
 * Trust score rules (from requirements):
 * - Providers: +10 on each completed request, -5 on rejected request
 * - Seekers: +5 on successful request (completed), -3 on cancellations (modeled as rejected)
 */
async function applyTrustForRequestStatus({ request, status }) {
  if (!request) return;

  if (status === 'completed') {
    await adjustTrustScore(request.providerId, 10);
    await adjustTrustScore(request.seekerId, 5);
    return;
  }

  if (status === 'rejected') {
    await adjustTrustScore(request.providerId, -5);
    await adjustTrustScore(request.seekerId, -3);
    return;
  }
}

module.exports = { adjustTrustScore, applyTrustForRequestStatus };

