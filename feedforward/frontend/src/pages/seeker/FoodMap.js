import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function FoodMap() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState([17.385, 78.4867]); // Default: Hyderabad

  useEffect(() => {
    api.get('/food/all')
      .then(({ data }) => setFoods(data.filter((f) => f.lat && f.lng)))
      .catch(() => toast.error('Failed to load food locations'))
      .finally(() => setLoading(false));

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const foodsWithCoords = foods.filter((f) => f.lat && f.lng);

  if (loading) return <LoadingSpinner text="Loading food map..." />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Food Map</h2>
        <p className="text-stone-500 text-sm mt-1">
          {foodsWithCoords.length} food listing{foodsWithCoords.length !== 1 ? 's' : ''} with location data
        </p>
      </div>

      {/* Legend */}
      <div className="card py-3 flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-stone-600">Available Food</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-stone-600">Your Location</span>
        </div>
        {foodsWithCoords.length === 0 && (
          <span className="text-amber-600 text-sm">
            ⚠️ No food listings have GPS coordinates yet. Providers need to add location when listing.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 card p-0 overflow-hidden" style={{ height: '480px' }}>
          <MapContainer
            center={userLocation}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {foodsWithCoords.map((food) => (
              <Marker
                key={food._id}
                position={[food.lat, food.lng]}
                icon={greenIcon}
                eventHandlers={{ click: () => setSelected(food) }}
              >
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-semibold text-stone-800">{food.foodName}</p>
                    <p className="text-stone-500 text-xs mt-1">{food.quantity}</p>
                    <p className="text-stone-500 text-xs">{food.location}</p>
                    <p className="text-stone-400 text-xs mt-1">By {food.providerId?.name}</p>
                    <p className="text-xs mt-1 text-amber-600">
                      Expires: {new Date(food.expiryTime).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar list */}
        <div className="card p-0 overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
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
                  <p className="text-xs text-stone-400">{food.quantity} · {food.providerId?.name}</p>
                  <div className={`mt-1 text-xs font-medium ${
                    food.status === 'available' ? 'text-forest-600' : 'text-stone-400'
                  }`}>
                    {food.status === 'available' ? '✅ Available' : `${food.status}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected food detail */}
      {selected && (
        <div className="card border-forest-200 bg-forest-50/30 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-stone-800 text-lg">{selected.foodName}</h3>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-stone-600">
                <p>📦 {selected.quantity}</p>
                <p>📍 {selected.location}</p>
                <p>👤 {selected.providerId?.name}</p>
                <p>⏰ Expires: {new Date(selected.expiryTime).toLocaleDateString()}</p>
              </div>
              {selected.description && (
                <p className="text-sm text-stone-500 mt-2">{selected.description}</p>
              )}
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
    </div>
  );
}
