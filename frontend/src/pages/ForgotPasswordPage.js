import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgotPassword } from '../utils/api';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage = () => {
  const navigate              = useNavigate();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <button className={styles.backBtn} onClick={() => navigate('/login')}>
          ← Back to Login
        </button>

        <div className={styles.iconWrap}>
          <span className={styles.icon}>{sent ? '📬' : '🔐'}</span>
        </div>

        {!sent ? (
          <>
            <h1 className={styles.title}>Forgot Password?</h1>
            <p className={styles.sub}>
              Enter your registered email and we'll send a reset link valid for 15 minutes.
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input" type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending...' : '📧 Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Check Your Email</h1>
            <p className={styles.sub}>
              We sent a reset link to <strong>{email}</strong>. Check your inbox and spam folder.
            </p>
            <div className={styles.steps}>
              <div className={styles.step}><span>1</span>Open the email from SafeHer</div>
              <div className={styles.step}><span>2</span>Click "Reset My Password"</div>
              <div className={styles.step}><span>3</span>Set your new password</div>
            </div>
            <button className={styles.resendBtn} onClick={() => setSent(false)}>
              Didn't receive it? Try again
            </button>
            <button className="btn-primary" onClick={() => navigate('/login')}
              style={{ marginTop: '0.75rem' }}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;