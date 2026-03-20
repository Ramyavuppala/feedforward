import { useCallback, useEffect, useState } from 'react';

const DEFAULT_LOCATION = { lat: 17.385, lng: 78.4867 }; // Hyderabad (fallback)

/**
 * Reusable geolocation hook.
 *
 * Uses:
 * - navigator.geolocation.getCurrentPosition
 * - enableHighAccuracy + timeout
 *
 * Notes:
 * - Geolocation generally requires a secure context (HTTPS), except `localhost`.
 * - We always start with a fallback location so the map never renders blank.
 */
export default function useUserLocation({
  defaultLocation = DEFAULT_LOCATION,
  timeoutMs = 10000,
  enableHighAccuracy = true,
} = {}) {
  const [lat, setLat] = useState(defaultLocation.lat);
  const [lng, setLng] = useState(defaultLocation.lng);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setPermissionDenied(true);
      setError('Geolocation is not supported in this browser.');
      setLat(defaultLocation.lat);
      setLng(defaultLocation.lng);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionDenied(false);
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setError(null);
        setLoading(false);
      },
      (err) => {
        // Permission denied error code is 1 in the Geolocation API.
        const denied = err?.code === 1;
        setPermissionDenied(denied);
        setError(denied ? 'Location permission denied.' : err?.message || 'Failed to get location.');
        setLat(defaultLocation.lat);
        setLng(defaultLocation.lng);
        setLoading(false);
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  }, [defaultLocation.lat, defaultLocation.lng, enableHighAccuracy, timeoutMs]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { lat, lng, loading, error, permissionDenied, requestLocation };
}

