import { useState, useEffect, useCallback } from 'react';
import { updateLocation } from '../utils/api';
import { useSocket } from '../context/SocketContext';

const useGeolocation = (autoShare = false) => {
  const { shareLocation } = useSocket();
  const [coords, setCoords]     = useState(null);
  const [address, setAddress]   = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId]   = useState(null);

  const reverseGeocode = useCallback(async (lat, lng) => {
    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!token || token.startsWith('pk.eyJ1IjoieW91cn')) return '';
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,neighborhood,address&limit=1`
      );
      const data = await res.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
    });
  }, []);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);

      if (autoShare) {
        shareLocation({ longitude: lng, latitude: lat, address: addr });
        await updateLocation({ longitude: lng, latitude: lat, address: addr });
      }

      return { lat, lng, address: addr };
    } catch (err) {
      const msg =
        err.code === 1 ? 'Location permission denied. Please enable GPS.' :
        err.code === 2 ? 'Location unavailable. Check GPS settings.' :
        err.code === 3 ? 'Location request timed out.' :
        err.message || 'Failed to get location';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [autoShare, getCurrentPosition, reverseGeocode, shareLocation]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId) return;
    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        shareLocation({ longitude: lng, latitude: lat });
        try {
          await updateLocation({ longitude: lng, latitude: lat });
        } catch { /* silent */ }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    setWatchId(id);
  }, [watchId, shareLocation]);

  const stopWatching = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setWatching(false);
    }
  }, [watchId]);

  useEffect(() => {
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [watchId]);

  return { coords, address, error, loading, watching, getLocation, startWatching, stopWatching };
};

export default useGeolocation;
