import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import useUserLocation from '../../hooks/useUserLocation';
import ExpiryCountdown from '../../components/ExpiryCountdown';
import StatusTracker from '../../components/StatusTracker';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedError, setRecommendedError] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(true);

  const {
    lat,
    lng,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    requestLocation,
  } = useUserLocation();

  useEffect(() => {
    Promise.all([
      api.get('/food/all'),
      api.get('/request/my'),
    ]).then(([f, r]) => {
      setAvailable(f.data);
      setRequests(r.data);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch recommended foods once we know the user's location (or fallback)
  useEffect(() => {
    if (locationLoading) return;

    // Guard against missing/invalid coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setRecommended([]);
      setRecommendedLoading(false);
      setRecommendedError('Unable to determine your location.');
      return;
    }

    setRecommendedLoading(true);
    setRecommendedError(null);

    api
      .get(`/food/recommended`, {
        params: { lat, lng },
      })
      .then((res) => {
        setRecommended(res.data || []);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Failed to load recommended food.';
        setRecommendedError(msg);
        setRecommended([]);
      })
      .finally(() => {
        setRecommendedLoading(false);
      });
  }, [lat, lng, locationLoading]);

  const recommendedDisplay = useMemo(() => {
    if (!recommended?.length) return [];
    // Backend already enforces strict distance-prioritized ranking.
    // The toggle currently only reflects UI intent.
    return recommended;
  }, [recommended, sortByDistance]);

  if (loading) return <LoadingSpinner />;

  const stats = {
    available: available.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">
          Welcome, {user?.name?.split(' ')[0]} 🙏
        </h2>
        <p className="text-stone-500 text-sm mt-1">Find food available near you</p>
      </div>

      {/* Nearest & Best Matches */}
      <div className="card border-forest-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              Nearest &amp; Best Matches
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-100">
                Recommended based on proximity and availability (distance prioritized)
              </span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Distance is strictly prioritized. We show the closest, most available food first.
            </p>
            {locationError && (
              <p className="text-xs text-amber-700 mt-1">
                {permissionDenied
                  ? 'Location permission denied. Using an approximate fallback location.'
                  : locationError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-forest-600 text-white shadow-sm hover:bg-forest-700 transition-colors"
            >
              <span>📍</span>
              <span>Detect My Location</span>
            </button>

            <button
              type="button"
              onClick={() => setSortByDistance((s) => !s)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                sortByDistance
                  ? 'bg-forest-50 border-forest-200 text-forest-800'
                  : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              <span
                className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                  sortByDistance ? 'bg-forest-500' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${
                    sortByDistance ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </span>
              <span>Sort by Distance</span>
            </button>
          </div>
        </div>

        {recommendedLoading || locationLoading ? (
          <div className="py-6 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
            <p className="text-xs text-stone-500">
              Finding best matches near you...
            </p>
          </div>
        ) : recommendedError ? (
          <p className="text-xs text-red-600 py-4 text-center">{recommendedError}</p>
        ) : !recommendedDisplay.length ? (
          <div className="py-8 text-center">
            <p className="text-sm text-stone-400">No nearby food available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendedDisplay.map((food, index) => {
              const distanceKm =
                typeof food.distanceKm === 'number'
                  ? food.distanceKm
                  : food.distance;
              const distanceLabel =
                Number.isFinite(distanceKm) && distanceKm >= 0
                  ? `${distanceKm.toFixed(2)} km away`
                  : 'Distance unavailable';

              const isBest = index === 0;

              return (
                <div
                  key={food._id}
                  className={`relative flex items-start justify-between gap-3 rounded-xl border transition-all ${
                    isBest
                      ? 'border-forest-300 bg-forest-50/80 shadow-sm scale-[1.01]'
                      : 'border-stone-100 bg-white hover:border-forest-200 hover:bg-forest-50/40'
                  } p-3`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-stone-900">
                        {food.foodName}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isBest
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isBest ? 'Nearest' : 'Close Match'}
                      </span>
                      {isBest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-forest-100 text-forest-700 border border-forest-200">
                          Best Match
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mb-1">
                      {food.remainingQuantity} {food.unit} remaining
                      {food.location ? ` · ${food.location}` : ''}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {food.expiryTime ? <ExpiryCountdown expiryTime={food.expiryTime} /> : 'Expires in: —'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <p className={`text-sm font-bold ${isBest ? 'text-emerald-700' : 'text-stone-700'}`}>
                      {distanceLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Food Available" value={stats.available} icon="🍱" color="forest" />
        <StatCard label="My Requests" value={requests.length} icon="📋" color="blue" />
        <StatCard label="Accepted" value={stats.accepted} icon="🤝" color="earth" />
        <StatCard label="Received" value={stats.completed} icon="🎉" color="amber" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/seeker/available', icon: '🍱', label: 'Browse Food', desc: `${stats.available} items available`, color: 'bg-forest-600' },
          { to: '/seeker/my-requests', icon: '📋', label: 'My Requests', desc: `${stats.pending} pending requests`, color: 'bg-blue-600' },
          { to: '/seeker/map', icon: '🗺️', label: 'Food Map', desc: 'Find food near you', color: 'bg-earth-600' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-start gap-4">
            <div className={`${a.color} w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white shadow-sm flex-shrink-0`}>
              {a.icon}
            </div>
            <div>
              <p className="font-semibold text-stone-800">{a.label}</p>
              <p className="text-sm text-stone-500 mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Nearby Food */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Available Food Nearby</h3>
          <Link to="/seeker/available" className="text-sm text-forest-600 hover:underline font-medium">View all</Link>
        </div>
        {available.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-stone-400 text-sm">No food available right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.slice(0, 4).map((food) => (
              <div key={food._id} className="p-3 rounded-xl border border-stone-100 hover:border-forest-200 hover:bg-forest-50/30 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-800 text-sm">{food.foodName}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {food.remainingQuantity} {food.unit} left · {food.location}
                    </p>
                    <p className="text-xs text-stone-400">
                      By {food.providerId?.name}
                    </p>
                    <div className="mt-1">
                      {food.expiryTime ? <ExpiryCountdown expiryTime={food.expiryTime} /> : null}
                    </div>
                  </div>
                  <StatusBadge status={food.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">My Recent Requests</h3>
          <Link to="/seeker/my-requests" className="text-sm text-forest-600 hover:underline font-medium">View all</Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-stone-400 text-sm py-6 text-center">You haven't made any requests yet</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {requests.slice(0, 5).map((req) => (
              <div key={req._id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-800 text-sm">{req.foodId?.foodName || '—'}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      From {req.providerId?.name} · {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                {req.status !== 'rejected' && (
                  <div className="mt-1 max-w-xs">
                    <StatusTracker
                      requestStatus={req.status}
                      volunteerStatus={req.volunteerTask?.status}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
