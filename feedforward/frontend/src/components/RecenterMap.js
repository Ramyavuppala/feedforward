import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Re-center a Leaflet map when coordinates change.
 *
 * Leaflet's `MapContainer` doesn't always re-center just from prop changes,
 * so we explicitly call `map.setView([lat, lng], zoom)` when lat/lng update.
 */
export default function RecenterMap({ lat, lng, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    // Setting the view does not update React state, so it won't trigger infinite re-renders.
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);

  return null;
}

