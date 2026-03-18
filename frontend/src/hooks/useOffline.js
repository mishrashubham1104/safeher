import { useState, useEffect, useCallback } from 'react';

// ── Cache keys ────────────────────────────────────────────────
const CACHE = {
  CONTACTS:  'safeher_offline_contacts',
  LOCATION:  'safeher_offline_location',
  USER:      'safeher_offline_user',
};

// ── Save data to localStorage cache ──────────────────────────
export const cacheContacts = (contacts) => {
  try {
    localStorage.setItem(CACHE.CONTACTS, JSON.stringify(contacts));
  } catch {}
};

export const cacheLocation = (location) => {
  try {
    localStorage.setItem(CACHE.LOCATION, JSON.stringify({
      ...location,
      cachedAt: new Date().toISOString(),
    }));
  } catch {}
};

export const cacheUser = (user) => {
  try {
    localStorage.setItem(CACHE.USER, JSON.stringify(user));
  } catch {}
};

// ── Get cached data ───────────────────────────────────────────
export const getCachedContacts  = () => {
  try { return JSON.parse(localStorage.getItem(CACHE.CONTACTS) || '[]'); } catch { return []; }
};
export const getCachedLocation  = () => {
  try { return JSON.parse(localStorage.getItem(CACHE.LOCATION)); }        catch { return null; }
};
export const getCachedUser      = () => {
  try { return JSON.parse(localStorage.getItem(CACHE.USER)); }            catch { return null; }
};

// ── Emergency helplines (always available offline) ────────────
export const EMERGENCY_NUMBERS = [
  { name: 'Police',          number: '100',  icon: '🚔' },
  { name: 'Women Helpline',  number: '181',  icon: '🆘' },
  { name: 'Ambulance',       number: '108',  icon: '🏥' },
  { name: 'Domestic Violence',number: '1091',icon: '🛡️' },
  { name: 'Cyber Crime',     number: '1930', icon: '💻' },
];

// ── Main hook ─────────────────────────────────────────────────
export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  // SMS SOS — works without internet
  const sendOfflineSOS = useCallback(() => {
    const contacts  = getCachedContacts();
    const location  = getCachedLocation();
    const user      = getCachedUser();

    if (contacts.length === 0) {
      alert('No emergency contacts saved. Please add contacts when online.');
      return;
    }

    const locText = location?.address || 'Location unknown';
    const msg     = `🚨 EMERGENCY! ${user?.name || 'Someone'} needs help! Last known location: ${locText}. Please call them immediately!`;

    // Open SMS app with first contact (native SMS — no internet needed)
    const firstContact = contacts[0];
    window.open(`sms:${firstContact.phone}?body=${encodeURIComponent(msg)}`);
  }, []);

  return { isOffline, sendOfflineSOS };
};

export default useOffline;