import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import RecenterMap from './RecenterMap';

// Fix default marker icons for React-Leaflet.
// (Without this, Leaflet can show missing marker images.)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const iconBase = {
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
};

const greenIcon = new L.Icon({
  ...iconBase,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const orangeIcon = new L.Icon({
  ...iconBase,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  ...iconBase,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  ...iconBase,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getFoodMarkerColor({ remainingQuantity, expiryTime, now, maxRemaining }) {
  const expiringSoon = new Date(expiryTime).getTime() - now <= 60 * 60 * 1000; // <= 1 hour
  if (expiringSoon) return 'red';

  const highThreshold = maxRemaining * 0.66;
  const mediumThreshold = maxRemaining * 0.33;
  if (remainingQuantity >= highThreshold) return 'green';
  if (remainingQuantity >= mediumThreshold) return 'orange';
  return 'red';
}

export default function MapView({
  foods,
  userLocation, // { lat, lng }
  onSelectFood,
  onRequestFood,
  height = 480,
}) {
  const now = Date.now();

  const foodsWithCoords = useMemo(() => {
    return (foods || []).filter((f) => f && Number.isFinite(f.lat) && Number.isFinite(f.lng));
  }, [foods]);

  const maxRemaining = useMemo(() => {
    return Math.max(1, ...foodsWithCoords.map((f) => Number(f.remainingQuantity) || 0));
  }, [foodsWithCoords]);

  const userLat = userLocation?.lat;
  const userLng = userLocation?.lng;

  return (
    <div className="card p-0 overflow-hidden" style={{ height: `${height}px` }}>
      <MapContainer
        center={[userLat, userLng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <RecenterMap lat={userLat} lng={userLng} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User marker */}
        {Number.isFinite(userLat) && Number.isFinite(userLng) && (
          <Marker position={[userLat, userLng]} icon={userIcon}>
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-semibold text-stone-800">You are here</p>
                <p className="text-stone-500 text-xs mt-1">📍 {userLat.toFixed(3)}, {userLng.toFixed(3)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Food markers */}
        {foodsWithCoords.map((food) => {
          const remainingQuantity = Number(food.remainingQuantity) || 0;
          const color = getFoodMarkerColor({
            remainingQuantity,
            expiryTime: food.expiryTime,
            now,
            maxRemaining,
          });
          const icon = color === 'green' ? greenIcon : color === 'orange' ? orangeIcon : redIcon;

          return (
            <Marker
              key={food._id}
              position={[food.lat, food.lng]}
              icon={icon}
              eventHandlers={{ click: () => onSelectFood?.(food) }}
            >
              <Popup>
                <div className="text-sm min-w-[200px] space-y-2">
                  <div>
                    <p className="font-semibold text-stone-800">{food.foodName}</p>
                    <p className="text-stone-500 text-xs mt-1">
                      📦 {food.remainingQuantity} {food.unit}
                    </p>
                    <p className="text-stone-400 text-xs mt-1">
                      ⏰ Expires: {new Date(food.expiryTime).toLocaleString()}
                    </p>
                    <p className="text-xs mt-1 text-stone-500">📍 {food.location}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary flex-1 py-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestFood?.(food);
                      }}
                    >
                      🙏 Request
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

