import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { to: '/home',      icon: '🏠', label: 'Home' },
  { to: '/map',       icon: '🗺️', label: 'Map' },
  { to: '/report',    icon: '🚨', label: 'Report' },
  { to: '/community', icon: '💬', label: 'Community' },
  { to: '/volunteer', icon: '🦺', label: 'Volunteer' },
  { to: '/contacts',  icon: '👥', label: 'Contacts' },
];

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  const items = user?.role === 'admin' || user?.role === 'moderator'
    ? [...NAV_ITEMS, { to: '/admin', icon: '⚙️', label: 'Admin' }]
    : NAV_ITEMS;

  return (
    <nav className={styles.nav}>
      {items.map(({ to, icon, label }) => {
        const isActive = location.pathname === to;
        return (
          <NavLink key={to} to={to} className={`${styles.item} ${isActive ? styles.active : ''}`}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
            {isActive && <div className={styles.activeDot} />}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;