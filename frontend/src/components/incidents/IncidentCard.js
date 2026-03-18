import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { upvoteIncident } from '../../utils/api';
import styles from './IncidentCard.module.css';

const SEV_CONFIG = {
  high:     { color: '#E53935', bg: '#FFEBEE', label: 'High Risk' },
  critical: { color: '#B71C1C', bg: '#FFCDD2', label: 'Critical' },
  medium:   { color: '#F57F17', bg: '#FFF8E1', label: 'Medium' },
  low:      { color: '#00897B', bg: '#E0F2F1', label: 'Low' },
};

const TYPE_ICON = {
  Harassment:   '😰',
  Stalking:     '👁️',
  Assault:      '🚨',
  'Unsafe Area':'⚠️',
  'Poor Lighting':'💡',
  Theft:        '👜',
  'Eve Teasing':'📣',
  Other:        '📝',
};

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const IncidentCard = ({ incident, onExpand }) => {
  const [votes, setVotes]       = useState(incident.upvoteCount || 0);
  const [voted, setVoted]       = useState(false);
  const [expanded, setExpanded] = useState(false);

  const sev = SEV_CONFIG[incident.severity] || SEV_CONFIG.medium;

  const handleUpvote = async (e) => {
    e.stopPropagation();
    try {
      const { data } = await upvoteIncident(incident._id);
      setVotes(data.upvoteCount);
      setVoted(data.upvoted);
    } catch {
      toast.error('Login to upvote');
    }
  };

  return (
    <div className={styles.card} onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.sevDot} style={{ background: sev.color }} />
        <div className={styles.meta}>
          <span className={styles.type}>
            {TYPE_ICON[incident.type] || '📍'} {incident.type}
          </span>
          <span className={styles.loc}>📍 {incident.location?.address}</span>
        </div>
        <span className={styles.time}>{timeAgo(incident.createdAt)}</span>
      </div>

      {/* Description */}
      <p className={`${styles.desc} ${expanded ? styles.descExpanded : ''}`}>
        {incident.description}
      </p>

      {/* Images */}
      {expanded && incident.images?.length > 0 && (
        <div className={styles.images}>
          {incident.images.map((img, i) => (
            <img key={i} src={img.url} alt="evidence" className={styles.evidenceImg} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span
          className={styles.badge}
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.label}
        </span>
        <span className={`${styles.statusBadge} ${incident.status === 'resolved' ? styles.resolved : ''}`}>
          {incident.status === 'resolved' ? '✓ Resolved' :
           incident.status === 'verified' ? '✓ Verified' :
           incident.status === 'investigating' ? '🔍 Investigating' : '● Active'}
        </span>

        <button
          className={`${styles.upvoteBtn} ${voted ? styles.voted : ''}`}
          onClick={handleUpvote}
          aria-label="Confirm incident"
        >
          ▲ <span>{votes}</span>
        </button>
      </div>
    </div>
  );
};

export default IncidentCard;
