import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

const AuthPage = () => {
  const { login, register } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const redirectTo  = location.state?.redirectTo || '/home';
  const openStory   = location.state?.openStory  || false;

  const [tab, setTab]         = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      toast.success('Welcome back! Stay safe 💗');
      navigate(redirectTo, { state: openStory ? { openStory: true } : undefined });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Please fill in all fields'); return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success('Account created! Stay safe 🛡️');
      // New users always see onboarding first
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.authScreen}>
      <div className={styles.authContainer}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.shieldWrap}>
            <span className={styles.shieldIcon}>🛡️</span>
          </div>
          <h1 className={styles.appTitle}>SafeHer</h1>
          <p className={styles.appTagline}>Women Safety & Emergency Platform</p>
          <div className={styles.statsRow}>
            <div className={styles.stat}><strong>100%</strong><span>Free</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><strong>24/7</strong><span>Active</span></div>
            <div className={styles.statDiv} />
            <div className={styles.stat}><strong>0</strong><span>Ads</span></div>
          </div>
        </div>

        {/* Card */}
        <div className={styles.card}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`} onClick={() => setTab('login')}>Sign In</button>
            <button className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`} onClick={() => setTab('register')}>Sign Up</button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" name="password" type="password" placeholder="Your password" value={form.password} onChange={handle} />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In Securely 🔐'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--primary)', fontFamily: 'Nunito, sans-serif',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  marginTop: '0.75rem', width: '100%', textAlign: 'center',
                }}
              >
                Forgot your password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="name" type="text" placeholder="Your full name" value={form.name} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" name="phone" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" name="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={handle} />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Free Account 🛡️'}
              </button>
            </form>
          )}

          <p className={styles.fineprint}>By continuing you agree to our Terms of Service &amp; Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;