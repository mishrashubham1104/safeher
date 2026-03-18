import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getIncidents, submitTestimonial } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useGeolocation from '../hooks/useGeolocation';
import AppHeader from '../components/layout/AppHeader';
import SOSButton from '../components/sos/SOSButton';
import IncidentCard from '../components/incidents/IncidentCard';
import styles from './HomePage.module.css';

const QUICK_ACTIONS = [
  { icon: '🚨', label: 'Report',    to: '/report',    color: '#FFEBEE', accent: '#E53935' },
  { icon: '🗺️', label: 'Map',       to: '/map',       color: '#E3F2FD', accent: '#1565C0' },
  { icon: '👥', label: 'Contacts',  to: '/contacts',  color: '#F3E5F5', accent: '#6A1B9A' },
  { icon: '🦺', label: 'Volunteer', to: '/volunteer', color: '#E8F5E9', accent: '#2E7D32' },
  { icon: '✍️', label: 'My Story',  to: null, action: 'story',    color: '#FFF8E1', accent: '#F57F17' },
  { icon: '📞', label: 'Helpline',  to: null, action: 'helpline', color: '#FCE4EC', accent: '#C2185B' },
];

const SEV_CONFIG = {
  all:    { label: 'All',    emoji: '📋' },
  high:   { label: 'High',   emoji: '🔴' },
  medium: { label: 'Medium', emoji: '🟡' },
  low:    { label: 'Low',    emoji: '🟢' },
};

// Inline SVG shield illustration
const ShieldSVG = () => (
  <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.shieldSvg}>
    {/* outer shield */}
    <path d="M36 4L10 14v20c0 14.4 10.8 27.9 26 31 15.2-3.1 26-16.6 26-31V14L36 4z"
      fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
    {/* inner shield */}
    <path d="M36 10L16 18v16c0 11.2 8.4 21.7 20 24.1C47.6 55.7 56 45.2 56 34V18L36 10z"
      fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    {/* checkmark */}
    <path d="M26 35l7 7 13-14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {/* top shine */}
    <path d="M22 16 Q36 10 50 16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const HomePage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { address, getLocation, watching, startWatching, stopWatching } = useGeolocation();

  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [showStoryModal,  setShowStoryModal]  = useState(false);
  const [storyForm,       setStoryForm]       = useState({ text: '', rating: 5, location: '', isAnonymous: false });
  const [submittingStory, setSubmittingStory] = useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    if (location.state?.openStory) {
      setShowStoryModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => { getLocation().catch(() => {}); }, []); // eslint-disable-line

  const fetchIncidents = useCallback(async (reset = false) => {
    try {
      const params = {
        page:   reset ? 1 : page,
        limit:  10,
        status: 'verified',
        ...(filter !== 'all' && { severity: filter }),
      };
      const { data } = await getIncidents(params);
      if (reset) { setIncidents(data.incidents); setPage(2); }
      else       { setIncidents(prev => [...prev, ...data.incidents]); setPage(p => p + 1); }
      setHasMore(data.page < data.pages);
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    setLoading(true);
    fetchIncidents(true);
  }, [filter]); // eslint-disable-line

  const handleQuickAction = (item) => {
    if (item.action === 'helpline')    window.open('tel:181');
    else if (item.action === 'story')  setShowStoryModal(true);
    else if (item.to)                  navigate(item.to);
  };

  const handleSubmitStory = async (e) => {
    e.preventDefault();
    if (!storyForm.text.trim())     { toast.error('Please write your story'); return; }
    if (!storyForm.location.trim()) { toast.error('Please add your city/location'); return; }
    setSubmittingStory(true);
    try {
      await submitTestimonial(storyForm);
      toast.success('🎉 Your story is now live on the homepage!');
      setShowStoryModal(false);
      setStoryForm({ text: '', rating: 5, location: '', isAnonymous: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingStory(false);
    }
  };

  return (
    <div className={styles.page}>
      <AppHeader />

      <div className={styles.scroll}>

        {/* ── HERO ── */}
        <div className={styles.hero}>
          {/* dot grid background */}
          <div className={styles.heroBg} />
          <div className={styles.heroStripe} />

          <div className={styles.heroText}>
            <p className={styles.greeting}>{greeting()},</p>
            <h1 className={styles.heroName}>{firstName} 💗</h1>
            <p className={styles.heroSub}>You are protected. Stay safe today.</p>

            {/* mini stats */}
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <strong>24/7</strong><span>Active</span>
              </div>
              <div className={styles.heroStatDiv} />
              <div className={styles.heroStat}>
                <strong>100%</strong><span>Free</span>
              </div>
              <div className={styles.heroStatDiv} />
              <div className={styles.heroStat}>
                <strong>0</strong><span>Ads</span>
              </div>
            </div>
          </div>

          {/* Shield illustration */}
          <div className={styles.shieldWrap}>
            <div className={styles.shieldGlow} />
            <ShieldSVG />
          </div>
        </div>

        {/* ── LOCATION BAR ── */}
        <div className={styles.locationBar}>
          <div className={`${styles.locDot} ${watching ? styles.locDotLive : ''}`} />
          <div className={styles.locText}>
            <strong>{watching ? '📡 Sharing Live Location' : '📍 Location Ready'}</strong>
            <span>{address || 'Tap GO LIVE to share your location'}</span>
          </div>
          <button
            className={`${styles.liveBtn} ${watching ? styles.liveBtnOn : ''}`}
            onClick={() => watching ? stopWatching() : startWatching()}
          >
            {watching ? '● LIVE' : 'GO LIVE'}
          </button>
        </div>

        {/* ── SOS ── */}
        <div className={styles.sosWrap}>
          <SOSButton />
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Quick Actions</p>
          <div className={styles.actionsGrid}>
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.label}
                className={styles.actionBtn}
                style={{ '--card-accent': item.accent }}
                onClick={() => handleQuickAction(item)}
              >
                <div className={styles.actionIcon} style={{ background: item.color }}>
                  <span>{item.icon}</span>
                </div>
                <span className={styles.actionLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TIP BANNER ── */}
        <div className={styles.tipBanner}>
          <span className={styles.tipIcon}>💡</span>
          <div className={styles.tipText}>
            <strong>Safety Tip</strong>
            <span>Share your live location with trusted contacts before travelling alone at night.</span>
          </div>
        </div>

        {/* ── NEARBY REPORTS ── */}
        <div className={styles.section}>
          <div className={styles.sectionRow}>
            <p className={styles.sectionTitle}>Nearby Reports</p>
            <div className={styles.filterPills}>
              {Object.entries(SEV_CONFIG).map(([key, val]) => (
                <button
                  key={key}
                  className={`${styles.pill} ${filter === key ? styles.pillActive : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.feed}>
            {loading ? (
              [1,2,3].map(i => <div key={i} className={`${styles.skeleton} skeleton`} />)
            ) : incidents.length === 0 ? (
              <div className={styles.empty}>
                <span>🌿</span>
                <p>All clear in your area!</p>
                <small>No incidents reported nearby. Stay alert.</small>
              </div>
            ) : (
              incidents.map(inc => <IncidentCard key={inc._id} incident={inc} />)
            )}
            {hasMore && !loading && (
              <button className={styles.loadMore} onClick={() => fetchIncidents()}>
                Load more reports ↓
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── SHARE STORY MODAL ── */}
      {showStoryModal && (
        <div className={styles.overlay} onClick={() => setShowStoryModal(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>✍️ Share Your Story</h2>
            <p className={styles.sheetSub}>Your experience will inspire others on the SafeHer homepage.</p>
            <form onSubmit={handleSubmitStory}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Rating</label>
                <div className={styles.stars}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button"
                      className={`${styles.star} ${storyForm.rating >= s ? styles.starOn : ''}`}
                      onClick={() => setStoryForm(f => ({ ...f, rating: s }))}>★</button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your City</label>
                <input className={styles.input} placeholder="e.g. Mumbai, Maharashtra"
                  value={storyForm.location}
                  onChange={e => setStoryForm(f => ({ ...f, location: e.target.value }))}
                  maxLength={60} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Experience</label>
                <textarea className={styles.textarea}
                  placeholder="How has SafeHer helped you or someone you know..."
                  value={storyForm.text}
                  onChange={e => setStoryForm(f => ({ ...f, text: e.target.value }))}
                  maxLength={500} rows={4} />
                <span className={styles.charCount}>{storyForm.text.length}/500</span>
              </div>
              <div className={styles.anonRow}
                onClick={() => setStoryForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}>
                <div className={`${styles.toggle} ${storyForm.isAnonymous ? styles.toggleOn : ''}`}>
                  <div className={styles.knob} />
                </div>
                <div>
                  <strong>Post Anonymously</strong>
                  <span>Your name will show as "Anonymous"</span>
                </div>
              </div>
              <div className={styles.sheetActions}>
                <button type="button" className={styles.cancelBtn}
                  onClick={() => setShowStoryModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={submittingStory}>
                  {submittingStory ? 'Posting...' : 'Post Story 💗'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;