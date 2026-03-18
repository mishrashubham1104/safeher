import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import { getTrackSession } from '../utils/api';
import io from 'socket.io-client';
import styles from './TrackPage.module.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const SOCKET_URL   = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const TrackPage = () => {
  const { token }              = useParams();
  const [session, setSession]  = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState('');
  const [ended,   setEnded]    = useState(false);
  const [stoppedAlert, setStoppedAlert] = useState(false);
  const [coords,  setCoords]   = useState(null);
  const [address, setAddress]  = useState('');
  const [lastSeen, setLastSeen]= useState(null);
  const [viewport, setViewport]= useState({ longitude: 72.8777, latitude: 19.0760, zoom: 15 });
  const socketRef = useRef(null);

  useEffect(() => {
    loadSession();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [token]); // eslint-disable-line

  const loadSession = async () => {
    try {
      const { data } = await getTrackSession(token);
      setSession(data.session);
      const lat = data.session.latitude || 0;
      const lng = data.session.longitude || 0;
      if (lng !== 0 || lat !== 0) {
        setCoords({ lng, lat });
        setViewport(v => ({ ...v, longitude: lng, latitude: lat }));
      }
      setAddress(data.session.address || '');
      setLastSeen(data.session.locationUpdatedAt);
      if (data.session.status === 'ended') setEnded(true);
      else connectSocket(data.session.token);
    } catch {
      setError('This tracking link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = (trackToken) => {
    const s = io(SOCKET_URL, { transports: ['polling', 'websocket'] });
    socketRef.current = s;

    s.emit('join_track', { trackToken });

    s.on('location_update', (data) => {
      const lat = data.latitude;
        const lng = data.longitude;
      setCoords({ lng, lat });
      setAddress(data.address || '');
      setLastSeen(data.timestamp);
      setViewport(v => ({ ...v, longitude: lng, latitude: lat }));
    });

    s.on('stopped_alert', (data) => {
      setStoppedAlert(data);
    });

    s.on('session_ended', () => {
      setEnded(true);
      s.disconnect();
    });
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 10)   return 'Just now';
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <p>Loading live location...</p>
    </div>
  );

  if (error) return (
    <div className={styles.center}>
      <span className={styles.errorIcon}>🔗</span>
      <h2>Link Expired</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={`${styles.dot} ${ended ? styles.dotEnded : styles.dotLive}`} />
          <div>
            <strong>{session?.sharedByName}</strong>
            <span>{ended ? 'Stopped sharing' : 'Sharing live location'}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {!ended && <span className={styles.livePill}>● LIVE</span>}
        </div>
      </div>

      {/* Stopped alert */}
      {stoppedAlert && (
        <div className={styles.stoppedBanner}>
          <span>⚠️</span>
          <div>
            <strong>Movement Alert!</strong>
            <span>{session?.sharedByName} hasn't moved for {stoppedAlert.minutes} minutes. Last seen: {stoppedAlert.address || 'Unknown'}</span>
          </div>
          <a href={`tel:${session?.sharedByPhone}`} className={styles.callNowBtn}>
            📞 Call Now
          </a>
        </div>
      )}

      {/* Ended banner */}
      {ended && (
        <div className={styles.endedBanner}>
          <span>✅</span>
          <span>{session?.sharedByName} has stopped sharing their location.</span>
        </div>
      )}

      {/* Map */}
      <div className={styles.mapWrap}>
        {!MAPBOX_TOKEN ? (
          <div className={styles.noMap}>
            <span>🗺️</span>
            <p>Map not configured</p>
          </div>
        ) : (
          <Map
            {...viewport}
            onMove={e => setViewport(e.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            {coords && (
              <Marker longitude={coords.lng} latitude={coords.lat} anchor="bottom">
                <div className={styles.marker}>
                  <div className={styles.markerDot}>
                    {session?.sharedByName?.charAt(0)?.toUpperCase()}
                  </div>
                  {!ended && <div className={styles.markerPulse} />}
                </div>
              </Marker>
            )}
          </Map>
        )}
      </div>

      {/* Info bar */}
      <div className={styles.infoBar}>
        <div className={styles.infoRow}>
          <span>📍</span>
          <span className={styles.infoAddr}>{address || 'Location updating...'}</span>
        </div>
        {lastSeen && (
          <div className={styles.infoRow}>
            <span>🕐</span>
            <span>Updated {timeAgo(lastSeen)}</span>
          </div>
        )}
        {session?.sharedByPhone && (
          <a href={`tel:${session.sharedByPhone}`} className={styles.callBtn}>
            📞 Call {session.sharedByName}
          </a>
        )}
        {coords && (
          <a
            href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
            target="_blank" rel="noreferrer"
            className={styles.directionsBtn}
          >
            🧭 Get Directions
          </a>
        )}
      </div>
    </div>
  );
};

export default TrackPage;