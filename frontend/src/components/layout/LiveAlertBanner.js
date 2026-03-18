import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import styles from './LiveAlertBanner.module.css';

const LiveAlertBanner = () => {
  const { liveAlerts, clearAlert } = useSocket();
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    if (liveAlerts.length > 0) {
      setVisible(liveAlerts[0]);
      const t = setTimeout(() => setVisible(null), 6000);
      return () => clearTimeout(t);
    }
  }, [liveAlerts]);

  if (!visible) return null;

  const isSOS = visible.type === 'sos';

  return (
    <div className={`${styles.banner} ${isSOS ? styles.sosBanner : styles.incBanner}`}>
      <div className={styles.pulse} />
      <span className={styles.msg}>{visible.message}</span>
      <button
        className={styles.dismiss}
        onClick={() => { clearAlert(visible.id); setVisible(null); }}
      >✕</button>
    </div>
  );
};

export default LiveAlertBanner;
