import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../utils/api';
import AppHeader from '../components/layout/AppHeader';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    shareLocation: user?.preferences?.shareLocation ?? true,
    receiveAlerts: user?.preferences?.receiveAlerts ?? true,
    alertRadius: user?.preferences?.alertRadius || 5,
    anonymousReporting: user?.preferences?.anonymousReporting ?? false,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [saving, setSaving] = useState(false);

  const handle    = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handlePw  = (k, v) => setPwForm((f) => ({ ...f, [k]: v }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        preferences: {
          shareLocation: form.shareLocation,
          receiveAlerts: form.receiveAlerts,
          alertRadius: form.alertRadius,
          anonymousReporting: form.anonymousReporting,
        },
      });
      await refreshUser();
      toast.success('Profile updated ✅');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmNew) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed ✅');
      setPwForm({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Logged out. Stay safe! 💗');
  };

  return (
    <div className={styles.page}>
      <AppHeader title="My Profile" showBack />
      <div className={styles.scroll}>
        {/* User hero */}
        <div className={styles.profileHero}>
          <div className={styles.avatar}>{user?.name?.charAt(0)?.toUpperCase()}</div>
          <h2 className={styles.profileName}>{user?.name}</h2>
          <p className={styles.profileEmail}>{user?.email}</p>
          <span className={styles.roleBadge}>{user?.role?.toUpperCase()}</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {['profile', 'security', 'preferences'].map((t) => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {/* Profile Tab */}
          {tab === 'profile' && (
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={(e) => handle('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={(e) => handle('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
              </div>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <form onSubmit={savePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={pwForm.currentPassword} onChange={(e) => handlePw('currentPassword', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={pwForm.newPassword} onChange={(e) => handlePw('newPassword', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={pwForm.confirmNew} onChange={(e) => handlePw('confirmNew', e.target.value)} />
              </div>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          )}

          {/* Preferences Tab */}
          {tab === 'preferences' && (
            <form onSubmit={saveProfile}>
              {[
                { key: 'shareLocation',       label: 'Share Live Location',    sub: 'Allow contacts to track you' },
                { key: 'receiveAlerts',        label: 'Receive Safety Alerts',  sub: 'Get notified of nearby incidents' },
                { key: 'anonymousReporting',   label: 'Anonymous by Default',   sub: 'Reports won\'t show your name' },
              ].map(({ key, label, sub }) => (
                <div key={key} className={styles.prefRow} onClick={() => handle(key, !form[key])}>
                  <div>
                    <strong>{label}</strong>
                    <span>{sub}</span>
                  </div>
                  <div className={`${styles.toggle} ${form[key] ? styles.toggleOn : ''}`}>
                    <div className={styles.knob} />
                  </div>
                </div>
              ))}

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Alert Radius: {form.alertRadius} km</label>
                <input
                  type="range" min="1" max="50" value={form.alertRadius}
                  onChange={(e) => handle('alertRadius', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          )}
        </div>

        {/* Logout */}
        <div className={styles.logoutSection}>
          <button className={styles.sosHistoryBtn} onClick={() => navigate('/sos-history')}>
            🚨 View SOS History
          </button>

          {/* Role refresh — useful after being promoted to admin in MongoDB */}
          <button
            className={styles.refreshRoleBtn}
            onClick={async () => {
              await refreshUser();
              toast.success('✅ Session refreshed!');
              // Navigate away and back to force full re-render with new role
              navigate('/home');
            }}
          >
            🔄 Refresh My Role / Session
          </button>

          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;