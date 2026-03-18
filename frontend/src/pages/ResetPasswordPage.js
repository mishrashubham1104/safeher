import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { resetPassword } from '../utils/api';
import styles from './ForgotPasswordPage.module.css';
import rStyles from './ResetPasswordPage.module.css';

const ResetPasswordPage = () => {
  const { token }    = useParams();
  const navigate     = useNavigate();
  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [show,    setShow]    = useState(false);

  const strength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    if (pw.length < 6)  return { level: 1, label: 'Too short',  color: '#E53935' };
    if (pw.length < 8)  return { level: 2, label: 'Weak',       color: '#FF7043' };
    if (pw.length < 10) return { level: 3, label: 'Medium',     color: '#FFB300' };
    return               { level: 4, label: 'Strong 💪',        color: '#2E7D32' };
  };

  const pw = strength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match'); return;
    }
    setLoading(true);
    try {
      await resetPassword(token, { password: form.password });
      setDone(true);
      toast.success('Password reset successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>{done ? '✅' : '🔑'}</span>
        </div>

        {!done ? (
          <>
            <h1 className={styles.title}>Set New Password</h1>
            <p className={styles.sub}>Choose a strong password you haven't used before.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className={rStyles.pwWrap}>
                  <input
                    className="form-input"
                    type={show ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoFocus
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="button" className={rStyles.eyeBtn}
                    onClick={() => setShow(s => !s)}>
                    {show ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password.length > 0 && (
                  <div className={rStyles.strengthWrap}>
                    <div className={rStyles.strengthTrack}>
                      <div className={rStyles.strengthFill}
                        style={{ width: `${(pw.level / 4) * 100}%`, background: pw.color }} />
                    </div>
                    <span className={rStyles.strengthLabel} style={{ color: pw.color }}>
                      {pw.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type={show ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                />
                {form.confirm && form.password !== form.confirm && (
                  <p style={{ fontSize: '0.72rem', color: '#E53935', marginTop: '4px' }}>
                    Passwords don't match
                  </p>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : '🔐 Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Password Reset!</h1>
            <p className={styles.sub}>
              Your password has been updated. You can now log in with your new password.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Go to Login →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;