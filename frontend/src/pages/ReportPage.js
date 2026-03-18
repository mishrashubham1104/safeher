import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createIncident } from '../utils/api';
import useGeolocation from '../hooks/useGeolocation';
import AppHeader from '../components/layout/AppHeader';
import styles from './ReportPage.module.css';

const INCIDENT_TYPES = [
  { type: 'Harassment',    icon: '😰' },
  { type: 'Stalking',      icon: '👁️' },
  { type: 'Assault',       icon: '🚨' },
  { type: 'Unsafe Area',   icon: '⚠️' },
  { type: 'Poor Lighting', icon: '💡' },
  { type: 'Theft',         icon: '👜' },
  { type: 'Eve Teasing',   icon: '📣' },
  { type: 'Other',         icon: '📝' },
];

const SEVERITIES = [
  { value: 'critical', label: '🔴 Critical', color: '#B71C1C', bg: '#FFCDD2' },
  { value: 'high',     label: '🔺 High',     color: '#E53935', bg: '#FFEBEE' },
  { value: 'medium',   label: '🟡 Medium',   color: '#F57F17', bg: '#FFF8E1' },
  { value: 'low',      label: '🟢 Low',      color: '#00897B', bg: '#E0F2F1' },
];

// Helper: convert a File to a base64 string
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // "data:image/png;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ReportPage = () => {
  const navigate = useNavigate();
  const { coords, address, loading: locLoading, error: locError, getLocation } = useGeolocation();

  const [form, setForm] = useState({
    type:          'Harassment',
    severity:      'high',
    description:   '',
    isAnonymous:   false,
    policeReported: false,
    policeReportNumber: '',
    tags:          '',
  });
  const [images, setImages]     = useState([]);   // base64 strings
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const handle = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  // Convert selected files → base64, store both for payload and preview
  const handleImages = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    const base64Array = await Promise.all(files.map(toBase64));
    setImages(base64Array);                                      // ✅ used in payload
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.type)              { toast.error('Please select an incident type'); return; }
    if (!form.severity)          { toast.error('Please select a severity level'); return; }
    if (!form.description.trim()){ toast.error('Please describe the incident'); return; }

    // Auto-fetch location if not already detected
    let finalCoords = coords;
    let finalAddress = address;

    if (!finalCoords) {
      try {
        toast.info('📍 Getting your location...');
        const loc = await getLocation();
        finalCoords = { lat: loc.lat, lng: loc.lng };
        finalAddress = loc.address;
      } catch {
        // Use 0,0 as fallback — user can still submit
        finalCoords = { lat: 0, lng: 0 };
        finalAddress = 'Location not available';
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        type:               form.type,
        severity:           form.severity,
        description:        form.description.trim(),
        longitude:          finalCoords.lng,
        latitude:           finalCoords.lat,
        address:            finalAddress || 'Unknown location',
        isAnonymous:        form.isAnonymous,
        policeReported:     form.policeReported,
        policeReportNumber: form.policeReportNumber || '',
        tags:               form.tags || '',
        images,             // ✅ base64 strings array included in JSON payload
      };

      await createIncident(payload);
      toast.success('✅ Incident reported! Thank you for keeping us safe.');
      navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report';
      toast.error(msg);
      console.error('Report error:', err.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <AppHeader title="Report Incident" showBack />
      <div className={styles.scroll}>
        <form onSubmit={handleSubmit} className={styles.form}>

          {/* Incident Type */}
          <p className="section-title" style={{ padding: 0, marginBottom: '0.75rem' }}>Incident Type</p>
          <div className={styles.typeGrid}>
            {INCIDENT_TYPES.map(({ type, icon }) => (
              <button
                key={type}
                type="button"
                className={`${styles.typeOption} ${form.type === type ? styles.typeSelected : ''}`}
                onClick={() => handle('type', type)}
              >
                <span className={styles.typeIcon}>{icon}</span>
                <span className={styles.typeLabel}>{type}</span>
              </button>
            ))}
          </div>

          {/* Severity */}
          <p className="section-title" style={{ padding: 0, marginBottom: '0.6rem' }}>Severity Level</p>
          <div className={styles.sevRow}>
            {SEVERITIES.map(({ value, label, color, bg }) => (
              <button
                key={value}
                type="button"
                className={styles.sevOption}
                style={form.severity === value ? { background: bg, borderColor: color, color } : {}}
                onClick={() => handle('severity', value)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Location */}
          <p className="section-title" style={{ padding: 0, marginBottom: '0.5rem' }}>Your Location</p>
          <button type="button" className={styles.locBtn} onClick={getLocation} disabled={locLoading}>
            <span className={styles.locIcon}>📍</span>
            <div className={styles.locText}>
              <strong>
                {locLoading ? 'Detecting location...' :
                 locError   ? 'Location error — tap to retry' :
                 address    ? address : 'Tap to detect GPS location'}
              </strong>
              <span>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Required for your safety'}</span>
            </div>
            {coords && <span style={{ color: 'var(--safe)', fontSize: '1rem' }}>✓</span>}
          </button>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              placeholder="Describe what happened in detail. The more info you provide, the better we can help."
              value={form.description}
              onChange={(e) => handle('description', e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <span style={{ fontSize: '0.68rem', color: '#bbb', float: 'right', marginTop: '2px' }}>
              {form.description.length}/1000
            </span>
          </div>

          {/* Photo Upload */}
          <p className="section-title" style={{ padding: 0, marginBottom: '0.5rem' }}>Evidence (Optional)</p>
          <div className={styles.photoUpload} onClick={() => fileRef.current?.click()}>
            {previews.length > 0 ? (
              <div className={styles.previewRow}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="preview" className={styles.preview} />
                ))}
                <span className={styles.addMore}>+ Add</span>
              </div>
            ) : (
              <>
                <span className={styles.photoIcon}>📷</span>
                <p>Tap to add photos or videos</p>
                <small>Max 3 files · Evidence helps authorities</small>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImages}
          />

          {/* Police Report */}
          <div className={styles.toggleRow} onClick={() => handle('policeReported', !form.policeReported)}>
            <div>
              <strong>Already reported to police?</strong>
              <span>Add FIR number to link records</span>
            </div>
            <div className={`${styles.toggle} ${form.policeReported ? styles.toggleOn : ''}`}>
              <div className={styles.toggleKnob} />
            </div>
          </div>

          {form.policeReported && (
            <div className="form-group">
              <label className="form-label">FIR / Report Number</label>
              <input
                className="form-input"
                placeholder="e.g. FIR/2024/0001"
                value={form.policeReportNumber}
                onChange={(e) => handle('policeReportNumber', e.target.value)}
              />
            </div>
          )}

          {/* Anonymous toggle */}
          <div className={styles.toggleRow} onClick={() => handle('isAnonymous', !form.isAnonymous)}>
            <div>
              <strong>Report Anonymously</strong>
              <span>Your identity will not be shared publicly</span>
            </div>
            <div className={`${styles.toggle} ${form.isAnonymous ? styles.toggleOn : ''}`}>
              <div className={styles.toggleKnob} />
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. night, bus stop, isolated area"
              value={form.tags}
              onChange={(e) => handle('tags', e.target.value)}
            />
          </div>

          {/* Submit */}
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting Report...' : 'Submit Report 🛡️'}
          </button>

          <p className={styles.note}>
            Reports are reviewed by our safety team within 30 minutes. False reports may result in account suspension.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ReportPage;