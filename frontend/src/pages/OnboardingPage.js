import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './OnboardingPage.module.css';

const SLIDES = [
  {
    id: 1,
    emoji:    '🛡️',
    gradient: 'linear-gradient(135deg, #880E4F 0%, #C2185B 50%, #FF4081 100%)',
    title:    'Your Safety,\nAlways On.',
    sub:      'SafeHer is your personal safety companion — available 24/7, completely free, with no subscriptions ever.',
    highlight: 'Always On',
    features: ['🚨 One-tap SOS', '📍 Live Location', '🗺️ Safety Map'],
  },
  {
    id: 2,
    emoji:    '👥',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #42A5F5 100%)',
    title:    'Add Emergency\nContacts',
    sub:      'Add up to 5 trusted people — family or friends. They get instant alerts with your live location when you need help.',
    highlight: 'Emergency\nContacts',
    features: ['📱 Instant SMS', '✉️ Email Alerts', '📍 Live GPS'],
  },
  {
    id: 3,
    emoji:    '🆘',
    gradient: 'linear-gradient(135deg, #E53935 0%, #D32F2F 50%, #FF7043 100%)',
    title:    'One Tap,\nInstant Help.',
    sub:      'Press SOS and your emergency contacts are notified instantly with your real-time location. No typing needed.',
    highlight: 'Instant Help',
    features: ['⚡ Under 3 seconds', '🔴 Live tracking', '💬 Community alerts'],
  },
  {
    id: 4,
    emoji:    '💗',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 50%, #66BB6A 100%)',
    title:    "You're\nProtected.",
    sub:      'Join thousands of women who feel safer every day with SafeHer. Your safety journey starts right now.',
    highlight: "You're\nProtected",
    features: ['✅ 100% Free', '🔒 Private & Secure', '🌍 Always Available'],
  },
];

const OnboardingPage = () => {
  const navigate   = useNavigate();
  const [current,   setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('next');

  const goTo = useCallback((idx, dir = 'next') => {
    if (animating || idx === current) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 350);
  }, [animating, current]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (current === SLIDES.length - 1) return;
    const timer = setTimeout(() => goTo(current + 1, 'next'), 4000);
    return () => clearTimeout(timer);
  }, [current, goTo]);

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1, 'next');
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (current > 0) goTo(current - 1, 'prev');
  };

  const finish = () => {
    localStorage.setItem('safeher_onboarded', 'true');
    localStorage.removeItem('safeher_is_new_user');
    navigate('/home');
  };

  const skip = () => {
    localStorage.setItem('safeher_onboarded', 'true');
    localStorage.removeItem('safeher_is_new_user');
    navigate('/home');
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div className={styles.page} style={{ background: slide.gradient }}>

      {/* Skip button */}
      {!isLast && (
        <button className={styles.skipBtn} onClick={skip}>
          Skip
        </button>
      )}

      {/* Slide content */}
      <div className={`${styles.content} ${animating ? (direction === 'next' ? styles.exitLeft : styles.exitRight) : styles.enter}`}>

        {/* Big emoji illustration */}
        <div className={styles.emojiWrap}>
          <div className={styles.emojiRing1} />
          <div className={styles.emojiRing2} />
          <div className={styles.emojiRing3} />
          <span className={styles.emoji}>{slide.emoji}</span>
        </div>

        {/* Slide number */}
        <p className={styles.slideNum}>{current + 1} of {SLIDES.length}</p>

        {/* Title */}
        <h1 className={styles.title}>
          {slide.title.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < slide.title.split('\n').length - 1 && <br />}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className={styles.sub}>{slide.sub}</p>

        {/* Feature pills */}
        <div className={styles.features}>
          {slide.features.map((f, i) => (
            <div
              key={f}
              className={styles.featurePill}
              style={{ animationDelay: `${i * 0.1 + 0.3}s` }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className={styles.bottom}>

        {/* Dot indicators */}
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => goTo(i, i > current ? 'next' : 'prev')}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className={styles.navBtns}>
          {current > 0 && (
            <button className={styles.prevBtn} onClick={handlePrev}>
              ←
            </button>
          )}

          <button
            className={`${styles.nextBtn} ${isLast ? styles.nextBtnFinal : ''}`}
            onClick={handleNext}
          >
            {isLast ? '🚀 Get Started Free' : 'Next →'}
          </button>
        </div>

        {/* Already have account */}
        {isLast && (
          <p className={styles.loginHint}>
            Tap anywhere to explore the app 💗
          </p>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;