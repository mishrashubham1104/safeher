import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getMyVolunteerProfile, registerVolunteer,
  getNearbyAlerts, respondToAlert,
  updateAlertStatus, getActiveAlert,
  updateVolunteerLocation,
} from '../utils/api';
import { useSocket } from '../context/SocketContext';
import AppHeader from '../components/layout/AppHeader';
import styles from './VolunteerPage.module.css';

const SKILLS    = ['First Aid', 'Self Defense', 'Counseling', 'Legal Aid', 'Medical', 'Transportation', 'Other'];
const AVAIL_OPT = [
  { value: 'always',    label: '24/7 Always' },
  { value: 'daytime',   label: 'Daytime Only' },
  { value: 'nighttime', label: 'Nighttime Only' },
  { value: 'weekends',  label: 'Weekends Only' },
];

const VolunteerPage = () => {
  const { socket } = useSocket();

  const [view,          setView]          = useState('loading');
  const [volunteer,     setVolunteer]     = useState(null);
  const [alerts,        setAlerts]        = useState([]);
  const [activeAlert,   setActiveAlert]   = useState(null);
  const [isOnline,      setIsOnline]      = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  const [regForm, setRegForm] = useState({
    skills: [], languages: 'Hindi, English', availability: 'always',
  });

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const { data } = await getNearbyAlerts({ latitude, longitude, radius: 10 });
            setAlerts(data.alerts || []);
            setLoadingAlerts(false);
          },
          async () => {
            const { data } = await getNearbyAlerts({ radius: 10 });
            setAlerts(data.alerts || []);
            setLoadingAlerts(false);
          }
        );
      }
    } catch {
      setLoadingAlerts(false);
    }
  }, []);

  const loadActiveAlert = useCallback(async () => {
    try {
      const { data } = await getActiveAlert();
      setActiveAlert(data.alert);
    } catch {}
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await getMyVolunteerProfile();
      setVolunteer(data.volunteer);
      setIsOnline(data.volunteer.isOnline);
      const status = data.volunteer.status;
      if (status === 'pending') {
        setView('pending');
      } else if (status === 'verified') {
        setView('dashboard');
        loadAlerts();
        loadActiveAlert();
      } else {
        setView('register');
      }
    } catch {
      setView('register');
    }
  }, [loadAlerts, loadActiveAlert]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Listen for real-time SOS alerts via socket
  useEffect(() => {
    if (!socket || !volunteer?._id) return;
    const handler = (data) => {
      toast.warning(`🚨 New SOS from ${data.userName} nearby!`, { autoClose: false });
      setAlerts(prev => [{
        _id:       data.alertId,
        userName:  data.userName,
        userPhone: data.userPhone,
        location:  data.location,
        status:    'active',
        createdAt: new Date(),
      }, ...prev]);
    };
    socket.on(`volunteer_alert_${volunteer._id}`, handler);
    socket.on('new_volunteer_alert', handler);
    return () => {
      socket.off(`volunteer_alert_${volunteer._id}`, handler);
      socket.off('new_volunteer_alert', handler);
    };
  }, [socket, volunteer?._id]);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await updateVolunteerLocation({
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            isOnline:  newStatus,
          });
        });
      }
      toast.success(newStatus ? '🟢 You are now Online' : '🔴 You are now Offline');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regForm.skills.length === 0) { toast.error('Select at least one skill'); return; }
    setSubmitting(true);
    try {
      await registerVolunteer({
        skills:       regForm.skills,
        languages:    regForm.languages.split(',').map(l => l.trim()),
        availability: regForm.availability,
      });
      toast.success('Application submitted! You\'ll be notified once verified.');
      setView('pending');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (alertId, status) => {
    try {
      await respondToAlert(alertId, { status });
      toast.success(status === 'accepted' ? '✅ Alert accepted! Head to the location.' : 'Alert declined');
      if (status === 'accepted') loadActiveAlert();
      loadAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    }
  };

  const handleUpdateStatus = async (alertId, status) => {
    try {
      await updateAlertStatus(alertId, { status, resolution: 'Volunteer assisted successfully' });
      toast.success(status === 'arrived' ? '📍 Marked as Arrived' : '✅ Alert resolved!');
      if (status === 'completed') setActiveAlert(null);
      else loadActiveAlert();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // ── LOADING ────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className={styles.page}>
        <AppHeader title="Volunteer" showBack />
        <div className={styles.center}>
          <div className={styles.loadingSpinner} />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ── REGISTER ──────────────────────────────────────────────
  if (view === 'register') {
    return (
      <div className={styles.page}>
        <AppHeader title="Become a Volunteer" showBack />
        <div className={styles.scroll}>
          <div className={styles.registerHero}>
            <span className={styles.heroEmoji}>🦺</span>
            <h2>Join Our Volunteer Network</h2>
            <p>Help women in your area during emergencies. You'll receive real-time alerts and can respond to those in need.</p>
          </div>

          <form onSubmit={handleRegister} className={styles.form}>
            {/* Skills */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Your Skills *</label>
              <p className={styles.formHint}>Select all that apply</p>
              <div className={styles.skillsGrid}>
                {SKILLS.map(skill => (
                  <button
                    key={skill} type="button"
                    className={`${styles.skillBtn} ${regForm.skills.includes(skill) ? styles.skillSelected : ''}`}
                    onClick={() => setRegForm(f => ({
                      ...f,
                      skills: f.skills.includes(skill)
                        ? f.skills.filter(s => s !== skill)
                        : [...f.skills, skill],
                    }))}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Languages Spoken</label>
              <input
                className="form-input"
                placeholder="Hindi, English, Marathi..."
                value={regForm.languages}
                onChange={e => setRegForm(f => ({ ...f, languages: e.target.value }))}
              />
            </div>

            {/* Availability */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Availability</label>
              <div className={styles.availGrid}>
                {AVAIL_OPT.map(opt => (
                  <button
                    key={opt.value} type="button"
                    className={`${styles.availBtn} ${regForm.availability === opt.value ? styles.availSelected : ''}`}
                    onClick={() => setRegForm(f => ({ ...f, availability: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className={styles.infoBox}>
              <p>⚠️ Your application will be reviewed by admin within 24 hours.</p>
              <p>📱 Keep notifications ON to receive emergency alerts.</p>
              <p>🆔 You may be asked to verify your identity.</p>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : '🙋 Submit Application'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── PENDING ────────────────────────────────────────────────
  if (view === 'pending') {
    return (
      <div className={styles.page}>
        <AppHeader title="Volunteer Status" showBack />
        <div className={styles.center}>
          <span style={{ fontSize: '3rem' }}>⏳</span>
          <h2 className={styles.pendingTitle}>Application Under Review</h2>
          <p className={styles.pendingSub}>
            Our admin team is verifying your application. This usually takes less than 24 hours.
          </p>
          <div className={styles.pendingSteps}>
            <div className={styles.pendingStep}>
              <div className={`${styles.stepDot} ${styles.stepDone}`}>✓</div>
              <span>Application submitted</span>
            </div>
            <div className={styles.pendingStep}>
              <div className={`${styles.stepDot} ${styles.stepActive}`}>2</div>
              <span>Admin review (in progress)</span>
            </div>
            <div className={styles.pendingStep}>
              <div className={styles.stepDot}>3</div>
              <span>Verified & activated</span>
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: '2rem' }} onClick={loadProfile}>
            🔄 Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <AppHeader title="Volunteer Dashboard" showBack />
      <div className={styles.scroll}>

        {/* Online toggle */}
        <div className={styles.statusCard}>
          <div className={styles.statusLeft}>
            <div className={`${styles.statusDot} ${isOnline ? styles.dotOnline : styles.dotOffline}`} />
            <div>
              <strong>{isOnline ? 'You are Online' : 'You are Offline'}</strong>
              <span>{isOnline ? 'Receiving nearby alerts' : 'Not receiving alerts'}</span>
            </div>
          </div>
          <div
            className={`${styles.toggle} ${isOnline ? styles.toggleOn : ''}`}
            onClick={handleToggleOnline}
          >
            <div className={styles.toggleKnob} />
          </div>
        </div>

        {/* Stats row */}
        {volunteer && (
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <strong>{volunteer.totalResponses}</strong>
              <span>Responses</span>
            </div>
            <div className={styles.statBox}>
              <strong>{volunteer.successfulHelps}</strong>
              <span>Helped</span>
            </div>
            <div className={styles.statBox}>
              <strong>{volunteer.rating > 0 ? volunteer.rating.toFixed(1) : '—'}</strong>
              <span>Rating</span>
            </div>
          </div>
        )}

        {/* Active alert */}
        {activeAlert && (
          <div className={styles.activeAlertCard}>
            <div className={styles.activeAlertHeader}>
              <span className={styles.activeAlertBadge}>🔴 ACTIVE</span>
              <span className={styles.activeAlertTime}>{timeAgo(activeAlert.createdAt)}</span>
            </div>
            <h3 className={styles.activeAlertName}>{activeAlert.userName}</h3>
            <p className={styles.activeAlertAddr}>📍 {activeAlert.location?.address}</p>
            <p className={styles.activeAlertPhone}>📞 {activeAlert.userPhone}</p>
            <a
              href={`https://maps.google.com/?q=${activeAlert.location?.coordinates?.[1]},${activeAlert.location?.coordinates?.[0]}`}
              target="_blank" rel="noreferrer"
              className={styles.directionsBtn}
            >
              🧭 Get Directions
            </a>
            <div className={styles.activeActions}>
              <button className={styles.arrivedBtn} onClick={() => handleUpdateStatus(activeAlert._id, 'arrived')}>
                📍 Mark Arrived
              </button>
              <button className={styles.resolveBtn} onClick={() => handleUpdateStatus(activeAlert._id, 'completed')}>
                ✅ Mark Resolved
              </button>
            </div>
          </div>
        )}

        {/* Nearby alerts */}
        <div className={styles.alertsSection}>
          <div className={styles.alertsHeader}>
            <p className="section-title" style={{ padding: 0, margin: 0 }}>Nearby SOS Alerts</p>
            <button className={styles.refreshBtn} onClick={loadAlerts}>🔄</button>
          </div>

          {loadingAlerts ? (
            <div className={styles.loadingRow}>Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className={styles.emptyAlerts}>
              <span>🌟</span>
              <p>No active alerts nearby</p>
              <small>Stay online to receive new alerts</small>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert._id} className={`${styles.alertCard} ${alert.status === 'active' ? styles.alertCardActive : ''}`}>
                <div className={styles.alertCardTop}>
                  <div>
                    <strong className={styles.alertName}>{alert.userName || alert.triggeredBy?.name}</strong>
                    <span className={styles.alertAddr}>📍 {alert.location?.address}</span>
                    <span className={styles.alertTime}>{timeAgo(alert.createdAt)}</span>
                  </div>
                  <span className={`${styles.alertStatusBadge} ${alert.status === 'active' ? styles.badgeActive : styles.badgeResponding}`}>
                    {alert.status}
                  </span>
                </div>

                {alert.status === 'active' && (
                  <div className={styles.alertActions}>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleRespond(alert._id, 'accepted')}
                    >
                      ✅ Accept
                    </button>
                    <button
                      className={styles.declineBtn}
                      onClick={() => handleRespond(alert._id, 'declined')}
                    >
                      ✕ Decline
                    </button>
                    <a
                      href={`tel:${alert.userPhone || alert.triggeredBy?.phone}`}
                      className={styles.callAlertBtn}
                    >
                      📞 Call
                    </a>
                  </div>
                )}

                {alert.status === 'responding' && (
                  <p className={styles.respondingNote}>A volunteer is responding to this alert</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerPage;