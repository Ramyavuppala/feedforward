import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MapView from '../../components/MapView';
import RequestModal from '../../components/RequestModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import useUserLocation from '../../hooks/useUserLocation';
import ExpiryCountdown from '../../components/ExpiryCountdown';

export default function FoodMap() {
  const [foods, setFoods] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [selected, setSelected] = useState(null);
  const [requestFood, setRequestFood] = useState(null);

  const {
    lat,
    lng,
    loading: loadingLocation,
    error: locationError,
    permissionDenied,
    requestLocation,
  } = useUserLocation();

  const [recommended, setRecommended] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  const foodsWithCoords = useMemo(
    () => (foods || []).filter((f) => f && Number.isFinite(f.lat) && Number.isFinite(f.lng)),
    [foods]
  );

  const fetchFoods = async () => {
    try {
      const { data } = await api.get('/food/all');
      setFoods(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load food locations');
    } finally {
      setLoadingFoods(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  // Save location so backend can later find nearby seekers for smart notifications.
  useEffect(() => {
    if (loadingLocation) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    api.put('/user/location', { lat, lng }).catch(() => {});
  }, [lat, lng, loadingLocation]);

  // Fetch smart recommendations once location is known (fallback is still a valid lat/lng).
  useEffect(() => {
    if (loadingLocation) return;

    setLoadingRecommended(true);
    api
      .get('/food/recommended', { params: { lat, lng, limit: 5 } })
      .then(({ data }) => setRecommended(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load recommendations'))
      .finally(() => setLoadingRecommended(false));
  }, [lat, lng, loadingLocation]);

  const bestMatchId = recommended?.[0]?._id;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Food Map</h2>
        <p className="text-stone-500 text-sm mt-1">
          {foodsWithCoords.length} food listing{foodsWithCoords.length !== 1 ? 's' : ''} with location data
        </p>
      </div>

      {/* Legend + permission handling */}
      <div className="card py-3 flex items-center justify-between gap-4 flex-wrap text-sm px-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-stone-600">High quantity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <span className="text-stone-600">Medium quantity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-stone-600">Low / expiring soon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-stone-600">Your Location</span>
          </div>
        </div>

        {permissionDenied ? (
          <span className="text-amber-700 text-sm font-medium">
            ⚠️ Location denied. Showing a default area.
          </span>
        ) : (
          <span className="text-stone-400 text-sm">
            {loadingLocation ? 'Detecting your location...' : 'Location ready.'}
          </span>
        )}
      </div>

      {permissionDenied && (
        <div className="card py-3 px-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-stone-600">
            We couldn’t access your GPS. You can still browse using the default map location.
          </div>
          <button type="button" onClick={requestLocation} className="btn-secondary">
            Detect My Location
          </button>
        </div>
      )}

      {locationError && !permissionDenied && (
        <div className="card py-3 px-4 text-sm text-red-600">
          {locationError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {loadingFoods && foodsWithCoords.length === 0 && (
            <LoadingSpinner text="Loading food map..." />
          )}

          <MapView
            foods={foodsWithCoords}
            userLocation={{ lat, lng }}
            onSelectFood={(food) => setSelected(food)}
            onRequestFood={(food) => setRequestFood(food)}
          />
        </div>

        <div className="card p-0 overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="font-semibold text-stone-700 text-sm">Recommended for You</p>
            <p className="text-xs text-stone-400 mt-1">
              Top picks based on distance, expiry, and quantity
            </p>
          </div>

          <div className="px-4 py-3 border-b border-stone-100 space-y-2">
            {loadingRecommended ? (
              <div className="text-sm text-stone-400">Loading recommendations...</div>
            ) : recommended.length === 0 ? (
              <div className="text-sm text-stone-400">No recommendations available yet.</div>
            ) : (
              recommended.slice(0, 5).map((food, idx) => (
                <div
                  key={food._id}
                  onClick={() => setSelected(food)}
                  className={`cursor-pointer p-2 rounded-lg transition-colors ${
                    selected?._id === food._id
                      ? 'bg-forest-50 border-l-2 border-forest-500'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <p className="font-medium text-stone-800 text-sm line-clamp-1">
                      {food.foodName}
                    </p>
                    {idx === 0 && bestMatchId === food._id && (
                      <span className="text-xs bg-forest-600 text-white px-2 py-0.5 rounded-full font-medium">
                        Best Match
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    {food.remainingQuantity} {food.unit} left
                  </div>
                  <div className="text-xs text-stone-400">
                    {food.expiryTime ? <ExpiryCountdown expiryTime={food.expiryTime} /> : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-b border-stone-100">
            <p className="font-semibold text-stone-700 text-sm">Listings on Map</p>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-stone-50">
            {foodsWithCoords.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-sm">
                <div className="text-3xl mb-2">📍</div>
                No geo-tagged listings yet
              </div>
            ) : (
              foodsWithCoords.map((food) => (
                <div
                  key={food._id}
                  onClick={() => setSelected(food)}
                  className={`p-3 cursor-pointer hover:bg-stone-50 transition-colors ${
                    selected?._id === food._id ? 'bg-forest-50 border-l-2 border-forest-500' : ''
                  }`}
                >
                  <p className="font-medium text-stone-800 text-sm">{food.foodName}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{food.location}</p>
                  <p className="text-xs text-stone-400">
                    {food.remainingQuantity} {food.unit} · {food.providerId?.name}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="card border-forest-200 bg-forest-50/30 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-stone-800 text-lg">{selected.foodName}</h3>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-stone-600">
                <p>📦 {selected.remainingQuantity} {selected.unit}</p>
                <p>📍 {selected.location}</p>
                <p>👤 {selected.providerId?.name}</p>
                <p>
                  <ExpiryCountdown expiryTime={selected.expiryTime} />
                </p>
              </div>
              {selected.description && <p className="text-sm text-stone-500 mt-2">{selected.description}</p>}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-stone-400 hover:text-stone-600 text-xl p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {requestFood && (
        <RequestModal
          food={requestFood}
          onClose={() => setRequestFood(null)}
          onSuccess={fetchFoods}
        />
      )}
    </div>
  );
}
