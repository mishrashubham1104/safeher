import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getAdminStats, getAllIncidentsAdmin, moderateIncident,
  getAllUsers, toggleUserStatus, getAllSOS,
  getAdminVolunteers, verifyVolunteer,
} from '../utils/api';
import AppHeader from '../components/layout/AppHeader';
import styles from './AdminPage.module.css';

const TABS = ['Overview', 'Incidents', 'Users', 'SOS Alerts', 'Volunteers'];

const STATUS_COLOR = {
  pending:   '#F57F17',
  verified:  '#2E7D32',
  rejected:  '#E53935',
  suspended: '#6A1B9A',
};

const AdminPage = () => {
  const [tab, setTab]               = useState('Overview');
  const [stats, setStats]           = useState(null);
  const [incidents, setIncidents]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [sos, setSos]               = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [incFilter, setIncFilter]   = useState('pending');
  const [volFilter, setVolFilter]   = useState('pending');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'Overview') {
        const { data } = await getAdminStats();
        setStats(data.stats);
      } else if (tab === 'Incidents') {
        const { data } = await getAllIncidentsAdmin({ status: incFilter, limit: 30 });
        setIncidents(data.incidents || []);
      } else if (tab === 'Users') {
        const { data } = await getAllUsers({ limit: 30 });
        setUsers(data.users || []);
      } else if (tab === 'SOS Alerts') {
        const { data } = await getAllSOS();
        setSos(data.sos || []);
      } else if (tab === 'Volunteers') {
        const { data } = await getAdminVolunteers({ status: volFilter });
        setVolunteers(data.volunteers || []);
      }
    } catch (err) {
      const msg    = err.response?.data?.message || err.message || 'Failed to load data';
      const status = err.response?.status;
      if (status === 403)      toast.error('⚠️ Access denied. Please sign out and sign back in.');
      else if (status === 401) toast.error('⚠️ Session expired. Please sign in again.');
      else                     toast.error(`Error: ${msg}`);
      console.error('Admin fetch error:', status, msg);
    } finally {
      setLoading(false);
    }
  }, [tab, incFilter, volFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleModerate = useCallback(async (id, status) => {
    try {
      await moderateIncident(id, { status });
      toast.success(`Incident ${status}`);
      fetchData();
    } catch { toast.error('Failed to update'); }
  }, [fetchData]);

  const handleToggleUser = useCallback(async (id) => {
    try {
      const { data } = await toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: !u.isActive } : u));
      toast.success(data.message);
    } catch { toast.error('Failed to update user'); }
  }, []);

  const handleVerifyVolunteer = useCallback(async (id, status) => {
    try {
      await verifyVolunteer(id, { status });
      toast.success(`Volunteer ${status}`);
      fetchData();
    } catch { toast.error('Failed to update volunteer'); }
  }, [fetchData]);

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.adminHeader}>
        <AppHeader title="Admin Dashboard" showBack />
        <div className={styles.tabBar}>
          {TABS.map((t) => (
            <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scroll}>
        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <div className={styles.overviewContent}>
            {loading ? (
              <div className={styles.statsGrid}>
                {[1,2,3,4].map((i) => <div key={i} className={`${styles.statCard} skeleton`} style={{ height: 90 }} />)}
              </div>
            ) : stats && (
              <>
                <div className={styles.statsGrid}>
                  {[
                    { num: stats.totalUsers,      label: 'Total Users',       trend: `+${stats.today.users} today`,   color: '#1565C0' },
                    { num: stats.totalIncidents,   label: 'Total Reports',     trend: `+${stats.today.incidents} today`, color: '#C2185B' },
                    { num: stats.pendingIncidents, label: 'Pending Review',    trend: 'Need attention',               color: '#F57F17' },
                    { num: stats.activeSOS,        label: 'Active SOS',        trend: `${stats.today.sos} today`,     color: '#E53935' },
                    { num: `${stats.resolutionRate}%`, label: 'Resolution Rate', trend: 'This month',               color: '#2E7D32' },
                    { num: stats.resolvedIncidents, label: 'Resolved',         trend: 'All time',                    color: '#2E7D32' },
                  ].map((s) => (
                    <div key={s.label} className={styles.statCard} style={{ borderTopColor: s.color }}>
                      <div className={styles.statNum} style={{ color: s.color }}>{s.num}</div>
                      <div className={styles.statLabel}>{s.label}</div>
                      <div className={styles.statTrend}>{s.trend}</div>
                    </div>
                  ))}
                </div>

                {/* Incident types */}
                <div className={styles.chartSection}>
                  <p className={styles.chartTitle}>Incidents by Type</p>
                  {stats.incidentsByType?.slice(0, 6).map((item) => (
                    <div key={item._id} className={styles.barRow}>
                      <span className={styles.barLabel}>{item._id}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.min((item.count / (stats.totalIncidents || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={styles.barCount}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── INCIDENTS ── */}
        {tab === 'Incidents' && (
          <div className={styles.tabContent}>
            <div className={styles.filterRow}>
              {['pending', 'verified', 'rejected', 'resolved', 'investigating'].map((f) => (
                <button
                  key={f}
                  className={`${styles.fChip} ${incFilter === f ? styles.fChipActive : ''}`}
                  onClick={() => setIncFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {loading ? <p className={styles.loadingText}>Loading...</p> :
             incidents.length === 0 ? <p className={styles.emptyText}>No {incFilter} incidents</p> :
             incidents.map((inc) => (
               <div key={inc._id} className={styles.adminCard}>
                 <div className={styles.adminCardTop}>
                   <div>
                     <strong className={styles.incType}>{inc.type}</strong>
                     <span className={styles.incMeta}>📍 {inc.location?.address} · {timeAgo(inc.createdAt)}</span>
                     {!inc.isAnonymous && inc.reportedBy && (
                       <span className={styles.incMeta}>👤 {inc.reportedBy.name} · {inc.reportedBy.phone}</span>
                     )}
                   </div>
                   <span className={`${styles.sevPill} ${styles['sev_' + inc.severity]}`}>{inc.severity}</span>
                 </div>
                 <p className={styles.incDesc}>{inc.description}</p>
                 {inc.status === 'pending' && (
                   <div className={styles.modActions}>
                     <button className={styles.verifyBtn} onClick={() => handleModerate(inc._id, 'verified')}>✓ Verify</button>
                     <button className={styles.investigateBtn} onClick={() => handleModerate(inc._id, 'investigating')}>🔍 Investigate</button>
                     <button className={styles.rejectBtn} onClick={() => handleModerate(inc._id, 'rejected')}>✕ Reject</button>
                   </div>
                 )}
                 {inc.status !== 'pending' && (
                   <span className={styles.resolvedNote}>Status: <strong>{inc.status}</strong></span>
                 )}
               </div>
             ))
            }
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'Users' && (
          <div className={styles.tabContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {users.length} user{users.length !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={fetchData}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', borderRadius: '8px', padding: '0.3rem 0.75rem',
                  fontFamily: 'Nunito, sans-serif', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <p className={styles.loadingText}>Loading users...</p>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>No users found</p>
                <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>Try clicking Refresh or sign out and back in</p>
                <button
                  onClick={fetchData}
                  style={{
                    marginTop: '1rem', background: '#C2185B', border: 'none',
                    color: '#fff', borderRadius: '10px', padding: '0.6rem 1.5rem',
                    fontFamily: 'Nunito, sans-serif', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  🔄 Try Again
                </button>
              </div>
            ) : (
              users.map((u) => (
                <div key={u._id} className={styles.adminCard}>
                  <div className={styles.userRow}>
                    <div className={styles.userAvatar} style={{ background: u.role === 'admin' ? '#C2185B' : '#1565C0' }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                      <span>{u.phone}</span>
                    </div>
                    <div className={styles.userRight}>
                      <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleAdmin : ''}`}>
                        {u.role}
                      </span>
                      <button
                        className={`${styles.toggleUserBtn} ${!u.isActive ? styles.toggleUserBtnInactive : ''}`}
                        onClick={() => handleToggleUser(u._id)}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SOS ALERTS ── */}
        {tab === 'SOS Alerts' && (
          <div className={styles.tabContent}>
            {loading ? <p className={styles.loadingText}>Loading...</p> :
             sos.length === 0 ? <p className={styles.emptyText}>No SOS alerts found</p> :
             sos.map((s) => (
               <div key={s._id} className={`${styles.adminCard} ${s.status === 'active' ? styles.sosActive : ''}`}>
                 <div className={styles.sosRow}>
                   <span className={styles.sosIcon}>{s.status === 'active' ? '🚨' : '✓'}</span>
                   <div style={{ flex: 1 }}>
                     <strong>{s.user?.name || 'Unknown'}</strong>
                     <span className={styles.incMeta}>{s.user?.phone} · {timeAgo(s.createdAt)}</span>
                     <span className={styles.incMeta}>📍 {s.location?.address || 'Location unknown'}</span>
                     <span className={styles.incMeta}>Notified: {s.contactsNotified?.length || 0} contacts</span>
                   </div>
                   <span className={`${styles.sosBadge} ${s.status === 'active' ? styles.sosBadgeActive : styles.sosBadgeResolved}`}>
                     {s.status.toUpperCase()}
                   </span>
                 </div>
               </div>
             ))
            }
          </div>
        )}

        {/* ── VOLUNTEERS ── */}
        {tab === 'Volunteers' && (
          <div className={styles.tabContent}>

            {/* Status filter */}
            <div className={styles.filterRow}>
              {['pending', 'verified', 'rejected', 'suspended'].map((f) => (
                <button
                  key={f}
                  className={`${styles.fChip} ${volFilter === f ? styles.fChipActive : ''}`}
                  style={volFilter === f ? { background: STATUS_COLOR[f], borderColor: STATUS_COLOR[f] } : {}}
                  onClick={() => setVolFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <p className={styles.loadingText}>Loading volunteers...</p>
            ) : volunteers.length === 0 ? (
              <div className={styles.emptyBox}>
                <span>🦺</span>
                <p>No {volFilter} volunteers</p>
                {volFilter === 'pending' && <small>New applications will appear here</small>}
              </div>
            ) : (
              volunteers.map((v) => (
                <div key={v._id} className={styles.adminCard}>
                  <div className={styles.volRow}>

                    {/* Avatar */}
                    <div className={styles.volAvatar}
                      style={{ background: STATUS_COLOR[v.status] || '#888' }}>
                      {v.name?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className={styles.volInfo}>
                      <strong>{v.name}</strong>
                      <span>{v.email}</span>
                      <span>{v.phone}</span>
                      <span className={styles.volSkills}>
                        {v.skills?.join(' · ') || 'No skills listed'}
                      </span>
                      <span className={styles.volAvailability}>
                        🕐 {v.availability} · {timeAgo(v.createdAt)}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className={styles.volRight}>
                      <span
                        className={styles.volStatusBadge}
                        style={{ background: STATUS_COLOR[v.status] + '22', color: STATUS_COLOR[v.status] }}
                      >
                        {v.status}
                      </span>
                      <span className={`${styles.volOnline} ${v.isOnline ? styles.volOnlineActive : ''}`}>
                        {v.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons for pending volunteers */}
                  {v.status === 'pending' && (
                    <div className={styles.modActions}>
                      <button
                        className={styles.verifyBtn}
                        onClick={() => handleVerifyVolunteer(v._id, 'verified')}
                      >
                        ✓ Verify
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleVerifyVolunteer(v._id, 'rejected')}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {/* Suspend verified volunteer */}
                  {v.status === 'verified' && (
                    <div className={styles.modActions}>
                      <span className={styles.resolvedNote}>
                        ✅ Verified · {v.totalResponses} responses · {v.successfulHelps} helped
                      </span>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleVerifyVolunteer(v._id, 'suspended')}
                      >
                        🚫 Suspend
                      </button>
                    </div>
                  )}

                  {/* Re-verify suspended/rejected */}
                  {(v.status === 'rejected' || v.status === 'suspended') && (
                    <div className={styles.modActions}>
                      <button
                        className={styles.verifyBtn}
                        onClick={() => handleVerifyVolunteer(v._id, 'verified')}
                      >
                        ✓ Re-verify
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;