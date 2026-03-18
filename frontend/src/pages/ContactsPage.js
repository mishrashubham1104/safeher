import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getContacts, addContact, deleteContact } from '../utils/api';
import { cacheContacts } from '../hooks/useOffline';
import AppHeader from '../components/layout/AppHeader';
import styles from './ContactsPage.module.css';

const COLORS = ['#C2185B', '#1565C0', '#2E7D32', '#6A1B9A', '#E65100'];
const RELATIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Husband', 'Partner', 'Colleague', 'Neighbour', 'Other'];

const EMERGENCY_SERVICES = [
  { name: 'Police Emergency', number: '100',  icon: '🚔', color: '#1565C0' },
  { name: 'Women Helpline',   number: '181',  icon: '🆘', color: '#C2185B' },
  { name: 'Ambulance',        number: '108',  icon: '🏥', color: '#2E7D32' },
  { name: 'Domestic Violence',number: '1091', icon: '🛡️', color: '#880E4F' },
  { name: 'Child Helpline',   number: '1098', icon: '👶', color: '#E65100' },
  { name: 'Cyber Crime',      number: '1930', icon: '💻', color: '#4A148C' },
];

const ContactsPage = () => {
  const navigate      = useNavigate();
  const [contacts,    setContacts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [callTarget,  setCallTarget]  = useState(null); // { name, phone, icon }
  const [form, setForm] = useState({
    name: '', phone: '', relation: 'Mother', email: '',
    notifyBySMS: true, notifyByEmail: true,
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data } = await getContacts();
      setContacts(data.contacts);
      cacheContacts(data.contacts); // save for offline use
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.relation) {
      toast.error('Name, phone and relation are required');
      return;
    }
    try {
      const { data } = await addContact(form);
      setContacts(data.contacts);
      setShowForm(false);
      setForm({ name: '', phone: '', relation: 'Mother', email: '', notifyBySMS: true, notifyByEmail: true });
      toast.success('✅ Contact added successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const { data } = await deleteContact(id);
      setContacts(data.contacts);
      toast.success('Contact removed');
    } catch {
      toast.error('Failed to remove contact');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero header */}
      <div className={styles.heroHeader}>
        <AppHeader title="Emergency Contacts" showBack />
        <div className={styles.heroBody}>
          <p className={styles.heroSub}>
            These contacts receive instant SOS alerts with your live GPS location
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <strong>{contacts.length}/5</strong>
              <span>Contacts</span>
            </div>
            <div className={styles.heroStatDiv} />
            <div className={styles.heroStat}>
              <strong>{contacts.filter((c) => c.notifyBySMS).length}</strong>
              <span>SMS</span>
            </div>
            <div className={styles.heroStatDiv} />
            <div className={styles.heroStat}>
              <strong>{contacts.filter((c) => c.notifyByEmail).length}</strong>
              <span>Email</span>
            </div>
          </div>
          <button
            className={styles.liveShareBtn}
            onClick={() => navigate('/liveshare')}
          >
            📍 Share Live Location
          </button>
        </div>
      </div>

      <div className={styles.scroll}>
        {/* My Contacts */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className="section-title" style={{ padding: 0, margin: 0 }}>My Trusted Contacts</p>
            {contacts.length < 5 && (
              <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
                {showForm ? '✕ Cancel' : '+ Add'}
              </button>
            )}
          </div>

          {/* Add Contact Form */}
          {showForm && (
            <form onSubmit={handleAdd} className={styles.addForm}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Contact's full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Relation *</label>
                <select className="form-input" value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}>
                  {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Email (for email alerts)</label>
                <input className="form-input" type="email" placeholder="contact@email.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className={styles.notifyToggles}>
                <label className={styles.ntLabel}>
                  <input type="checkbox" checked={form.notifyBySMS} onChange={(e) => setForm((f) => ({ ...f, notifyBySMS: e.target.checked }))} />
                  <span>Notify by SMS</span>
                </label>
                <label className={styles.ntLabel}>
                  <input type="checkbox" checked={form.notifyByEmail} onChange={(e) => setForm((f) => ({ ...f, notifyByEmail: e.target.checked }))} />
                  <span>Notify by Email</span>
                </label>
              </div>
              <button className="btn-primary" type="submit">Add Emergency Contact</button>
            </form>
          )}

          {/* Contact Cards */}
          {loading ? (
            [1,2,3].map((i) => <div key={i} className={`${styles.skeletonCard} skeleton`} />)
          ) : contacts.length === 0 ? (
            <div className={styles.empty}>
              <span>👥</span>
              <p>No emergency contacts yet</p>
              <small>Add up to 5 trusted contacts who will be alerted during SOS</small>
              <button className={styles.addEmptyBtn} onClick={() => setShowForm(true)}>
                + Add First Contact
              </button>
            </div>
          ) : (
            contacts.map((c, i) => (
              <div key={c._id} className={styles.contactCard}>
                <div className={styles.avatar} style={{ background: COLORS[i % COLORS.length] }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.contactInfo}>
                  <strong>{c.name}</strong>
                  <span>{c.relation} · {c.phone}</span>
                  <div className={styles.notifyBadges}>
                    {c.notifyBySMS && (
                      <button
                        className={styles.badgeBtn}
                        onClick={() => window.open(`sms:${c.phone}?body=Hi ${c.name}, I wanted to reach out via SafeHer.`)}
                        title={`Send SMS to ${c.name}`}
                      >
                        💬 SMS
                      </button>
                    )}
                    {c.notifyByEmail && c.email && (
                      <button
                        className={`${styles.badgeBtn} ${styles.badgeBtnEmail}`}
                        onClick={() => window.open(`mailto:${c.email}?subject=Message from SafeHer&body=Hi ${c.name},`)}
                        title={`Send Email to ${c.name}`}
                      >
                        ✉️ Email
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.contactActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.callBtn}`}
                    onClick={() => setCallTarget({ name: c.name, phone: c.phone, icon: '📞' })}
                    title="Call"
                  >📞</button>
                  <button
                    className={`${styles.actionBtn} ${styles.delBtn}`}
                    onClick={() => handleDelete(c._id)}
                    disabled={deleting === c._id}
                    title="Remove contact"
                  >
                    {deleting === c._id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Emergency Services */}
        <section className={styles.section}>
          <p className="section-title" style={{ padding: 0, marginBottom: '0.75rem' }}>Emergency Services</p>
          {EMERGENCY_SERVICES.map((s) => (
            <div key={s.number} className={styles.contactCard}>
              <div className={styles.avatar} style={{ background: s.color }}>
                <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              </div>
              <div className={styles.contactInfo}>
                <strong>{s.name}</strong>
                <span>Dial {s.number}</span>
              </div>
              <div className={styles.contactActions}>
                <button className={`${styles.actionBtn} ${styles.callBtn}`} onClick={() => setCallTarget({ name: s.name, phone: s.number, icon: s.icon })}>📞</button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* ── CALL CONFIRMATION MODAL ───────────────────────── */}
      {callTarget && (
        <div className={styles.callOverlay} onClick={() => setCallTarget(null)}>
          <div className={styles.callSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.callHandle} />

            <div className={styles.callIcon}>{callTarget.icon}</div>
            <h3 className={styles.callName}>{callTarget.name}</h3>
            <p className={styles.callPhone}>{callTarget.phone}</p>
            <p className={styles.callSub}>Do you want to call this number?</p>

            <div className={styles.callActions}>
              <button
                className={styles.callCancelBtn}
                onClick={() => setCallTarget(null)}
              >
                Cancel
              </button>
              <button
                className={styles.callConfirmBtn}
                onClick={() => {
                  window.open(`tel:${callTarget.phone}`);
                  setCallTarget(null);
                }}
              >
                📞 Call Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;