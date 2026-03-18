import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { startLiveShare, updateLiveLocation, endLiveShare, getMyLiveSessions } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import AppHeader from '../components/layout/AppHeader';
import styles from './LiveSharePage.module.css';

const LiveSharePage = () => {
  const { socket }              = useSocket();
  const [session,   setSession] = useState(null);  // active session
  const [sessions,  setSessions]= useState([]);     // history
  const [loading,   setLoading] = useState(true);
  const [starting,  setStarting]= useState(false);
  const [stoppedAlert, setStoppedAlert] = useState(false);
  const watchIdRef = useRef(null);
  const sessionRef = useRef(null);

  // Keep ref in sync for use inside geolocation callback
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    loadSessions();
    return () => stopWatching();
  }, []); // eslint-disable-line

  // Socket: listen for stopped-motion alert
  useEffect(() => {
    if (!socket) return;
    socket.on('stopped_alert', () => setStoppedAlert(true));
    return () => socket.off('stopped_alert');
  }, [socket]);

  const loadSessions = async () => {
    try {
      const { data } = await getMyLiveSessions();
      setSessions(data.sessions || []);
      const active = data.sessions?.find(s => s.status === 'active');
      if (active) { setSession(active); startWatching(active); }
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const startWatching = useCallback((activeSession) => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const sess = sessionRef.current || activeSession;
        if (!sess) return;
        try {
          await updateLiveLocation(sess._id, { latitude, longitude, address: '' });
        } catch { /* silent — don't spam toasts */ }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  const stopWatching = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { data } = await startLiveShare({});
      setSession(data.session);
      setStoppedAlert(false);
      startWatching(data.session);
      toast.success(`📍 Live location shared with your emergency contacts!`);
      loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start sharing');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    try {
      await endLiveShare(session._id);
      stopWatching();
      setSession(null);
      setStoppedAlert(false);
      toast.success('Live sharing ended');
      loadSessions();
    } catch {
      toast.error('Failed to end session');
    }
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const duration = (start, end) => {
    const ms = (end ? new Date(end) : new Date()) - new Date(start);
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div className={styles.page}>
      <AppHeader title="Live Location" showBack />
      <div className={styles.scroll}>

        {/* Stopped-motion alert banner */}
        {stoppedAlert && (
          <div className={styles.stoppedBanner}>
            <span>⚠️</span>
            <div>
              <strong>Movement Alert Sent</strong>
              <span>Your contacts were notified you stopped moving for 5+ minutes.</span>
            </div>
          </div>
        )}

        {/* Active session card */}
        {session ? (
          <div className={styles.activeCard}>
            <div className={styles.activeHeader}>
              <div className={styles.liveDot} />
              <span className={styles.liveLabel}>LIVE SHARING</span>
              <span className={styles.liveDuration}>{duration(session.startedAt)}</span>
            </div>

            <div className={styles.activeInfo}>
              <p className={styles.activeSubTitle}>Shared with {session.sharedWith?.length} contact(s)</p>
              <div className={styles.contactPills}>
                {session.sharedWith?.map((c, i) => (
                  <span key={i} className={styles.contactPill}>{c.name}</span>
                ))}
              </div>
            </div>

            <div className={styles.trackLinkBox}>
              <p className={styles.trackLinkLabel}>Tracking link (share manually)</p>
              <div className={styles.trackLinkRow}>
                <span className={styles.trackLink}>
                  {window.location.origin}/track/{session.token}
                </span>
                <button
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/track/${session.token}`);
                    toast.success('Link copied!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.alertInfo}>
              <span>🔔</span>
              <span>Auto-alert sent if you stop moving for <strong>5 minutes</strong></span>
            </div>

            <button className={styles.endBtn} onClick={handleEnd}>
              ⏹ Stop Sharing
            </button>
          </div>
        ) : (
          /* Start sharing card */
          <div className={styles.startCard}>
            <div className={styles.startHero}>
              <div className={styles.startIconRing}>
                <span className={styles.startIcon}>📍</span>
              </div>
              <h2>Share Live Location</h2>
              <p>Your emergency contacts will receive a tracking link and can see you moving in real-time on a map.</p>
            </div>

            <div className={styles.featureList}>
              <div className={styles.featureRow}>
                <span>📡</span><span>Real-time location updates every few seconds</span>
              </div>
              <div className={styles.featureRow}>
                <span>🔔</span><span>Auto-alert if you stop moving for 5 minutes</span>
              </div>
              <div className={styles.featureRow}>
                <span>📧</span><span>Tracking link sent to all emergency contacts</span>
              </div>
              <div className={styles.featureRow}>
                <span>🔒</span><span>Session ends when you tap Stop Sharing</span>
              </div>
            </div>

            <button
              className={styles.startBtn}
              onClick={handleStart}
              disabled={starting || loading}
            >
              {starting ? '⏳ Starting...' : '📍 Start Live Sharing'}
            </button>
          </div>
        )}

        {/* Session history */}
        {sessions.filter(s => s.status === 'ended').length > 0 && (
          <div className={styles.historySection}>
            <p className={styles.historyTitle}>Past Sessions</p>
            {sessions.filter(s => s.status === 'ended').map(s => (
              <div key={s._id} className={styles.historyCard}>
                <div className={styles.historyLeft}>
                  <span className={styles.historyIcon}>📍</span>
                  <div>
                    <strong>{timeAgo(s.startedAt)}</strong>
                    <span>Duration: {duration(s.startedAt, s.endedAt)}</span>
                    <span>{s.sharedWith?.length} contact(s)</span>
                  </div>
                </div>
                <span className={styles.endedBadge}>Ended</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default LiveSharePage;