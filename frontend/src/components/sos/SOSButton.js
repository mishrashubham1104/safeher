import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { triggerSOS, cancelSOS, updateSOSLocation } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import useGeolocation from '../../hooks/useGeolocation';
import styles from './SOSButton.module.css';

const SOSButton = () => {
  const { socket } = useSocket();
  const { coords, address, getLocation } = useGeolocation();
  const [sosState, setSosState]       = useState('idle');   // idle | confirm | active | cancelled
  const [sosId, setSosId]             = useState(null);
  const [countdown, setCountdown]     = useState(5);
  const [contacts, setContacts]       = useState([]);
  const timerRef  = useRef(null);
  const trackRef  = useRef(null);

  // Live location tracking during SOS
  const startTracking = useCallback((id) => {
    trackRef.current = setInterval(async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await updateSOSLocation(id, { latitude, longitude });
          if (socket) socket.emit('sos_location_update', { sosId: id, latitude, longitude });
        } catch { /* silent */ }
      });
    }, 10000); // every 10s
  }, [socket]);

  const stopTracking = useCallback(() => {
    if (trackRef.current) { clearInterval(trackRef.current); trackRef.current = null; }
  }, []);

  const handleSOSPress = () => {
    if (sosState === 'active') return;
    setSosState('confirm');
    setCountdown(5);
  };

  const confirmSOS = async () => {
    setSosState('active');
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    try {
      let lat = coords?.lat, lng = coords?.lng, addr = address;
      if (!lat) {
        try { ({ lat, lng, address: addr } = await getLocation()); }
        catch { lat = 0; lng = 0; addr = 'Location unavailable'; }
      }

      const { data } = await triggerSOS({ latitude: lat, longitude: lng, address: addr });
      setSosId(data.sos._id);
      setContacts(data.sos.contactsNotified || []);
      startTracking(data.sos._id);
      toast.error('🚨 SOS ALERT SENT! Your contacts have been notified.', { autoClose: false });
    } catch (err) {
      toast.error('Failed to send SOS: ' + (err.response?.data?.message || err.message));
      setSosState('idle');
    }
  };

  const handleCancel = async () => {
    clearInterval(timerRef.current);
    stopTracking();
    if (sosId) {
      try { await cancelSOS(sosId, { status: 'cancelled', notes: 'Cancelled by user' }); }
      catch { /* silent */ }
    }
    setSosState('idle');
    setSosId(null);
    setContacts([]);
    toast.info('SOS alert cancelled. Stay safe! 💗');
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopTracking();
    };
  }, [stopTracking]);

  // ── CONFIRM STATE ──────────────────────────────────────────
  if (sosState === 'confirm') return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmCard}>
        <div className={styles.confirmIcon}>🚨</div>
        <h2 className={styles.confirmTitle}>Send SOS Alert?</h2>
        <p className={styles.confirmSub}>
          This will immediately notify your emergency contacts with your live GPS location.
        </p>
        <div className={styles.confirmActions}>
          <button className={styles.cancelBtn} onClick={() => setSosState('idle')}>Cancel</button>
          <button className={styles.sendBtn} onClick={confirmSOS}>SEND SOS NOW</button>
        </div>
      </div>
    </div>
  );

  // ── ACTIVE STATE ───────────────────────────────────────────
  if (sosState === 'active') return (
    <div className={styles.activeOverlay}>
      <div className={styles.activeIcon}>🚨</div>
      <h1 className={styles.activeTitle}>SOS ACTIVATED</h1>
      <p className={styles.activeSub}>Notifying contacts &amp; sharing live location</p>

      <div className={styles.countdownRing}>
        <span>{countdown > 0 ? countdown : '✓'}</span>
      </div>

      <div className={styles.notifyList}>
        <p className={styles.notifyHeader}>CONTACTS BEING NOTIFIED</p>
        {contacts.map((c, i) => (
          <div key={i} className={styles.notifyRow}>
            <span className={styles.notifyName}>{c.name}</span>
            <span className={styles.notifyBadge}>
              {c.smsSent || c.emailSent ? '✓ SENT' : 'SENDING...'}
            </span>
          </div>
        ))}
        {contacts.length === 0 && (
          <p className={styles.noContacts}>
            ⚠️ No emergency contacts set up yet.{' '}
            <a href="/contacts" style={{ color: '#fff', textDecoration: 'underline' }}>Add contacts →</a>
          </p>
        )}
        <div className={styles.notifyRow}>
          <span className={styles.notifyName}>Police Emergency (100)</span>
          <span className={styles.notifyBadge}>ALERTED</span>
        </div>
      </div>

      <div className={styles.liveLocBadge}>
        📍 Live location being tracked &amp; shared
      </div>

      <button className={styles.cancelSOSBtn} onClick={handleCancel}>
        Cancel SOS Alert
      </button>
    </div>
  );

  // ── IDLE STATE ─────────────────────────────────────────────
  return (
    <div className={styles.sosSection}>
      <div className={styles.btnWrap}>
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />
        <button className={styles.sosBtn} onClick={handleSOSPress} aria-label="SOS Emergency Button">
          <span className={styles.sosText}>SOS</span>
          <small className={styles.sosHint}>TAP FOR EMERGENCY</small>
        </button>
      </div>
      <p className={styles.hintText}>Instantly alerts emergency contacts &amp; shares live location</p>
    </div>
  );
};

export default SOSButton;
