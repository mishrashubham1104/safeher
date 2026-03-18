import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './AppHeader.module.css';

const AppHeader = ({ title, showBack = false, rightSlot }) => {
  const { user }        = useAuth();
  const { onlineCount } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const navigate        = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack ? (
          <button className={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        ) : (
          <div className={styles.logo} onClick={() => navigate('/home')}>
            Safe<span>Her</span>
          </div>
        )}
        {title && <h1 className={styles.title}>{title}</h1>}
      </div>

      <div className={styles.right}>
        {!showBack && (
          <div className={styles.onlineBadge}>
            <div className={styles.onlineDot} />
            <span>{onlineCount} online</span>
          </div>
        )}

        {/* Dark / Light mode toggle */}
        <button
          className={styles.themeBtn}
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {rightSlot || (
          <button className={styles.avatarBtn} onClick={() => navigate('/profile')}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;