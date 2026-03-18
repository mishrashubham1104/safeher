import React, { useState, useEffect } from 'react';
import { getSOSHistory } from '../utils/api';
import { toast } from 'react-toastify';
import AppHeader from '../components/layout/AppHeader';
import styles from './SOSHistoryPage.module.css';

const SOSHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSOSHistory()
      .then(({ data }) => setHistory(data.history))
      .catch(() => toast.error('Failed to load SOS history'))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_STYLE = {
    active:     { color: '#E53935', bg: '#FFEBEE', label: '● Active' },
    cancelled:  { color: '#888',    bg: '#f5f5f5',  label: '✕ Cancelled' },
    resolved:   { color: '#00897B', bg: '#E0F2F1',  label: '✓ Resolved' },
    false_alarm:{ color: '#F57F17', bg: '#FFF8E1',  label: '! False Alarm' },
  };

  return (
    <div className={styles.page}>
      <AppHeader title="SOS History" showBack />
      <div className={styles.scroll}>
        {loading ? (
          <div className={styles.loading}>Loading history...</div>
        ) : history.length === 0 ? (
          <div className={styles.empty}>
            <span>🛡️</span>
            <p>No SOS alerts triggered yet</p>
            <small>Your SOS history will appear here</small>
          </div>
        ) : (
          <div className={styles.list}>
            {history.map((s) => {
              const st = STATUS_STYLE[s.status] || STATUS_STYLE.cancelled;
              return (
                <div key={s._id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}>🚨</span>
                    <div className={styles.info}>
                      <strong>SOS Alert</strong>
                      <span>📍 {s.location?.address || 'Location unknown'}</span>
                      <span>{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span>Contacts notified: {s.contactsNotified?.length || 0}</span>
                    {s.responseTime && <span>Response time: {s.responseTime}s</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSHistoryPage;
