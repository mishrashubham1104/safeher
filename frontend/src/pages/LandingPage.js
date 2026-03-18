import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTestimonials, submitTestimonial } from '../utils/api';
import { toast } from 'react-toastify';
import styles from './LandingPage.module.css';

/* ── tiny hook: is element in viewport ── */
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

/* ── data ── */
const FEATURES = [
  {
    icon: '🚨',
    title: 'One-Tap SOS',
    desc: 'Instantly alert your emergency contacts and share your live GPS location with a single tap.',
    color: '#E53935',
    img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
    route: '/home',
    label: 'Try SOS →',
  },
  {
    icon: '🗺️',
    title: 'Live Safety Map',
    desc: 'Real-time map showing verified incident zones, safe areas, and community reports near you.',
    color: '#1565C0',
    img: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80',
    route: '/map',
    label: 'Open Map →',
  },
  {
    icon: '📍',
    title: 'Live Location Share',
    desc: 'Share your live location with trusted contacts so they always know where you are.',
    color: '#2E7D32',
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    route: '/home',
    label: 'Share Location →',
  },
  {
    icon: '📝',
    title: 'Incident Reporting',
    desc: 'Report harassment, unsafe zones, and suspicious activity. Anonymous reporting supported.',
    color: '#C2185B',
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80',
    route: '/report',
    label: 'Report Now →',
  },
  {
    icon: '💬',
    title: 'Community Safety Chat',
    desc: 'Real-time community chat powered by Socket.io. Share safety tips and alerts instantly.',
    color: '#6A1B9A',
    img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80',
    route: '/community',
    label: 'Join Chat →',
  },
  {
    icon: '👥',
    title: 'Emergency Contacts',
    desc: 'Add up to 5 trusted contacts who get SMS + email alerts the moment you trigger SOS.',
    color: '#E65100',
    img: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&q=80',
    route: '/contacts',
    label: 'Add Contacts →',
  },
];

const HOW_STEPS = [
  { step: '01', title: 'Sign Up Free', desc: 'Create your account in under 30 seconds. No payment, no ads — ever.', icon: '✍️' },
  { step: '02', title: 'Add Contacts',  desc: 'Add up to 5 trusted people who will be notified instantly in emergencies.', icon: '👥' },
  { step: '03', title: 'Stay Protected', desc: 'Use the SOS button, map, and community to stay safe every day.', icon: '🛡️' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    location: 'Mumbai, Maharashtra',
    text: 'SafeHer literally saved me. I was being followed late at night and hit SOS — my sister got my location in seconds and called the police.',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&q=80',
    rating: 5,
  },
  {
    name: 'Ananya Reddy',
    location: 'Hyderabad, Telangana',
    text: 'The safety map showed me which areas near my office are risky. I changed my route and feel so much more confident commuting.',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80',
    rating: 5,
  },
  {
    name: 'Meera Iyer',
    location: 'Bangalore, Karnataka',
    text: 'As a student who walks home at night, this app gives me real peace of mind. The community chat keeps everyone updated on unsafe areas.',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80',
    rating: 5,
  },
];

const NAV_LINKS = ['Features', 'How It Works', 'Safety Map', 'Testimonials', 'Download'];

/* ════════════════════════════════════════════════════════════ */

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [navHidden,   setNavHidden]   = useState(false);
  const [activeNav,   setActiveNav]   = useState('');
  const [heroLoaded,  setHeroLoaded]  = useState(false);
  const [showFaq,          setShowFaq]          = useState(false);
  const [showPrivacy,      setShowPrivacy]      = useState(false);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [liveTestimonials, setLiveTestimonials] = useState([]);
  const [testimonialForm,  setTestimonialForm]  = useState({ text: '', rating: 5, location: '', isAnonymous: false });
  const [submittingTest,   setSubmittingTest]   = useState(false);
  const lastScrollY = useRef(0);

  // Fetch live testimonials from API
  useEffect(() => {
    getTestimonials()
      .then(({ data }) => {
        if (data.testimonials?.length > 0) {
          setLiveTestimonials(data.testimonials);
        }
      })
      .catch(() => {}); // silently fall back to hardcoded
  }, []);

  // If user is logged in navigate directly, else go to login with redirect state
  const handleFeatureClick = (route) => {
    if (user) {
      navigate(route);
    } else {
      navigate('/login', { state: { redirectTo: route } });
    }
  };

  const handleSubmitTestimonial = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!testimonialForm.text.trim()) { toast.error('Please write your testimonial'); return; }
    if (!testimonialForm.location.trim()) { toast.error('Please add your location'); return; }
    setSubmittingTest(true);
    try {
      await submitTestimonial(testimonialForm);
      toast.success('🎉 Your testimonial is now live on the page!');
      setShowTestimonialForm(false);
      setTestimonialForm({ text: '', rating: 5, location: '', isAnonymous: false });
      // Refresh testimonials to show the new one immediately
      const { data } = await getTestimonials();
      if (data.testimonials?.length > 0) setLiveTestimonials(data.testimonials);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingTest(false);
    }
  };

  // Navbar scroll effect — hide on scroll down, show on scroll up
  useEffect(() => {
    const toId = (l) => l.toLowerCase().replace(/\s+/g, '-');
    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      // Hide when scrolling DOWN past 80px, show when scrolling UP
      if (currentY > 80) {
        if (diff > 6) {
          setNavHidden(true);   // scrolling down — hide
        } else if (diff < -4) {
          setNavHidden(false);  // scrolling up — show
        }
      } else {
        setNavHidden(false);    // near top — always show
      }

      setScrolled(currentY > 50);
      lastScrollY.current = currentY;

      const sections = NAV_LINKS.map(l => document.getElementById(toId(l)));
      sections.forEach((sec, i) => {
        if (sec) {
          const rect = sec.getBoundingClientRect();
          if (rect.top <= 80 && rect.bottom >= 80) setActiveNav(NAV_LINKS[i]);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hero entrance
  useEffect(() => { setTimeout(() => setHeroLoaded(true), 100); }, []);

  // Smooth scroll
  const scrollTo = (id) => {
    const el = document.getElementById(id.toLowerCase().replace(/\s+/g, '-'));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  // InView refs
  const [featRef, featInView]     = useInView(0.1);
  const [howRef,  howInView]      = useInView(0.2);
  const [testRef, testInView]     = useInView(0.2);

  // Mobile section navigator
  const SECTIONS = ['Home', 'Features', 'How It Works', 'Safety Map', 'Testimonials', 'Download'];
  const sectionIds = ['home-hero', 'features', 'how-it-works', 'safety-map', 'testimonials', 'download'];
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      sectionIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            setCurrentSectionIdx(i);
          }
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line
  }, []);

  const goToPrevSection = () => {
    const prevIdx = Math.max(0, currentSectionIdx - 1);
    const el = document.getElementById(sectionIds[prevIdx]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToNextSection = () => {
    const nextIdx = Math.min(SECTIONS.length - 1, currentSectionIdx + 1);
    const el = document.getElementById(sectionIds[nextIdx]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.page}>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''} ${navHidden ? styles.navHidden : ''}`}>
        <div className={styles.navInner}>
          {/* Logo */}
          <div className={styles.navLogo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={styles.navLogoIcon}>🛡️</div>
            <span>Safe<em>Her</em></span>
          </div>

          {/* Desktop Links */}
          <ul className={styles.navLinks}>
            {NAV_LINKS.map(link => (
              <li key={link}>
                <button
                  className={`${styles.navLink} ${activeNav === link ? styles.navLinkActive : ''}`}
                  onClick={() => scrollTo(link)}
                >
                  {link}
                </button>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className={styles.navCtas}>
            <button className={styles.navLoginBtn} onClick={() => navigate('/login')}>Sign In</button>
            <button className={styles.navSignupBtn} onClick={() => navigate('/login')}>Get Started Free</button>
          </div>

          {/* Hamburger */}
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
          {NAV_LINKS.map(link => (
            <button key={link} className={styles.mobileNavLink} onClick={() => scrollTo(link)}>
              {link}
            </button>
          ))}
          <div className={styles.mobileCtas}>
            <button className={styles.navLoginBtn} onClick={() => navigate('/login')}>Sign In</button>
            <button className={styles.navSignupBtn} onClick={() => navigate('/login')}>Get Started Free →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section id="home-hero" className={`${styles.hero} ${heroLoaded ? styles.heroLoaded : ''}`}>
        {/* Background collage */}
        <div className={styles.heroBg}>
          <div className={styles.heroBgOverlay} />
          <img
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1600&q=85"
            alt=""
            className={styles.heroBgImg}
          />
        </div>

        <div className={styles.heroContent}>
          {/* LEFT: text */}
          <div className={styles.heroLeft}>
            <div className={styles.heroPill}>
              <span className={styles.heroPillDot} />
              Trusted by 50,000+ women across India
            </div>

            <h1 className={styles.heroTitle}>
              Your Safety.<br />
              <span className={styles.heroTitleAccent}>Always On.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Real-time SOS alerts, live safety maps, incident reporting and community support —
              all in one free app built for women's safety.
            </p>

            <div className={styles.heroCtas}>
              <button className={styles.heroCtaPrimary} onClick={() => navigate('/login')}>
                Get Protected Free
                <span className={styles.heroCtaArrow}>→</span>
              </button>
              <button className={styles.heroCtaSecondary} onClick={() => scrollTo('How It Works')}>
                <span className={styles.playIcon}>▶</span>
                See How It Works
              </button>
            </div>

            <div className={styles.heroTrustRow}>
              <div className={styles.heroAvatars}>
                {[
                  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&q=80',
                  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=40&q=80',
                  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=40&q=80',
                  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=40&q=80',
                ].map((src, i) => (
                  <img key={i} src={src} alt="user" className={styles.heroAvatar} style={{ zIndex: 4 - i }} />
                ))}
              </div>
              <span className={styles.heroTrustText}>★★★★★ Rated 4.9 by 12,000+ users</span>
            </div>
          </div>

          {/* RIGHT: visual cards */}
          <div className={styles.heroRight}>
            <div className={styles.heroCard} style={{ animationDelay: '0.8s' }}>
              <img src="https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=400&q=80" alt="safety" className={styles.heroCardImg} />
              <div className={styles.heroCardBadge} style={{ background: '#E53935' }}>🚨 SOS Active — Contacts Notified</div>
            </div>
            <div className={styles.heroCard} style={{ animationDelay: '1.1s', marginTop: '1rem', marginLeft: '2rem' }}>
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" alt="community" className={styles.heroCardImg} />
              <div className={styles.heroCardBadge} style={{ background: '#1565C0' }}>📍 Live Location Shared</div>
            </div>
            <div className={styles.heroStatPill} style={{ animationDelay: '1.4s' }}>
              <span className={styles.heroStatPillDot} />
              <span>1,247 women safe right now</span>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className={styles.scrollHint} onClick={() => scrollTo('Features')}>
          <div className={styles.scrollMouse}><div className={styles.scrollWheel} /></div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      {/* Solid cover block — prevents features text showing behind hero on mobile */}
      <div className={styles.featuresSectionWrap}>
      <section id="features" ref={featRef} className={styles.featuresSection}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>Everything You Need</p>
          <h2 className={styles.sectionTitle}>Features built for real emergencies</h2>
          <p className={styles.sectionSub}>Every feature is designed with one goal: keep you safe when it matters most.</p>
        </div>

        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`${styles.featureCard} ${featInView ? styles.featureCardVisible : ''}`}
              style={{ animationDelay: `${i * 0.1}s`, cursor: 'pointer' }}
              onClick={() => handleFeatureClick(f.route)}
            >
              <div className={styles.featureImgWrap}>
                <img src={f.img} alt={f.title} className={styles.featureImg} />
                <div className={styles.featureImgOverlay} style={{ background: f.color + 'cc' }} />
                <div className={styles.featureIconBig}>{f.icon}</div>
              </div>
              <div className={styles.featureBody}>
                <div className={styles.featureIconSmall} style={{ background: f.color + '22', color: f.color }}>
                  {f.icon}
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
                <div className={styles.featureCta} style={{ color: f.color }}>
                  {f.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="how-it-works" ref={howRef} className={styles.howSection}>
        <div className={styles.howBg} />
        <div className={styles.sectionHead} style={{ position: 'relative' }}>
          <p className={styles.sectionEyebrow} style={{ color: '#F8BBD0' }}>Simple & Fast</p>
          <h2 className={styles.sectionTitle} style={{ color: '#fff' }}>Up and running in 3 steps</h2>
        </div>

        <div className={styles.howSteps}>
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.step}
              className={`${styles.howStep} ${howInView ? styles.howStepVisible : ''}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className={styles.howStepNum}>{s.step}</div>
              <div className={styles.howStepIcon}>{s.icon}</div>
              <h3 className={styles.howStepTitle}>{s.title}</h3>
              <p className={styles.howStepDesc}>{s.desc}</p>
              {i < HOW_STEPS.length - 1 && <div className={styles.howConnector} />}
            </div>
          ))}
        </div>

        {/* Phone mockup image */}
        <div className={styles.phoneMockup}>
          <div className={styles.phoneMockupFrame}>
            <img
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&q=85"
              alt="App on phone"
              className={styles.phoneMockupImg}
            />
            <div className={styles.phoneMockupOverlay}>
              <div className={styles.phoneSosButton}>SOS</div>
              <p style={{ color: '#fff', fontSize: '0.7rem', marginTop: '0.5rem' }}>Tap for emergency</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFETY MAP PREVIEW ────────────────────────────────── */}
      <section id="safety-map" className={styles.mapSection}>
        <div className={styles.mapContent}>
          <div className={styles.mapText}>
            <p className={styles.sectionEyebrow}>Live Safety Intelligence</p>
            <h2 className={styles.sectionTitle}>See danger zones before you walk into them</h2>
            <p className={styles.sectionSub}>
              Community-reported incidents, verified by our safety team, plotted on a live Mapbox map.
              Filter by type, severity, and time.
            </p>
            <ul className={styles.mapBullets}>
              {[
                '🔴 High-risk incident zones',
                '🟡 Areas requiring caution',
                '🟢 Verified safe zones',
                '📍 Your live location',
                '🚨 Active SOS alerts nearby',
              ].map(b => <li key={b}>{b}</li>)}
            </ul>
            <button className={styles.mapCta} onClick={() => navigate('/login')}>
              Open Safety Map →
            </button>
          </div>
          <div className={styles.mapPreview}>
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=85"
              alt="Safety Map"
              className={styles.mapPreviewImg}
            />
            <div className={styles.mapPreviewOverlay}>
              <div className={styles.mapPin} style={{ top: '30%', left: '40%', background: '#E53935' }}>⚠️</div>
              <div className={styles.mapPin} style={{ top: '55%', left: '60%', background: '#F57F17' }}>⚡</div>
              <div className={styles.mapPin} style={{ top: '70%', left: '30%', background: '#2E7D32' }}>🛡️</div>
              <div className={styles.mapUserDot} style={{ top: '48%', left: '50%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section id="testimonials" ref={testRef} className={styles.testimonialsSection}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>Real Stories</p>
          <h2 className={styles.sectionTitle}>Women who feel safer with SafeHer</h2>
          <p className={styles.sectionSub}>Real experiences from our community. Share yours too.</p>
        </div>

        {/* Testimonials grid — live from DB or fallback to hardcoded */}
        <div className={styles.testimonialsGrid}>
          {(liveTestimonials.length > 0 ? liveTestimonials : TESTIMONIALS).map((t, i) => (
            <div
              key={t._id || t.name}
              className={`${styles.testimonialCard} ${testInView ? styles.testimonialCardVisible : ''}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className={styles.testimonialStars}>{'★'.repeat(t.rating)}</div>
              <p className={styles.testimonialText}>"{t.text}"</p>
              <div className={styles.testimonialAuthor}>
                {t.avatar ? (
                  <img src={t.avatar} alt={t.name} className={styles.testimonialAvatar} />
                ) : (
                  <div className={styles.testimonialAvatarFallback}>
                    {t.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <strong>{t.isAnonymous ? 'Anonymous' : t.name}</strong>
                  <span>{t.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Share Your Story CTA */}
        <div className={styles.testimonialCta}>
          <p className={styles.testimonialCtaText}>
            {liveTestimonials.length > 0
              ? `${liveTestimonials.length} women have shared their stories`
              : 'Be the first to share your story'}
          </p>
          <button
            className={styles.testimonialCtaBtn}
            onClick={() => {
              if (user) {
                navigate('/home', { state: { openStory: true } });
              } else {
                navigate('/login', { state: { redirectTo: '/home', openStory: true } });
              }
            }}
          >
            ✍️ Share Your Story
          </button>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────── */}
      <section id="download" className={styles.ctaBanner}>
        <div className={styles.ctaBannerBg} />
        <div className={styles.ctaBannerContent}>
          <div className={styles.ctaImageWrap}>
            <img
              src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&q=85"
              alt="Women safety"
              className={styles.ctaImage}
            />
          </div>
          <div className={styles.ctaText}>
            <h2 className={styles.ctaTitle}>
              Your safety<br />
              <span>starts now.</span>
            </h2>
            <p className={styles.ctaSub}>
              Join 50,000+ women who use SafeHer every day.<br />
              Free forever. No ads. No subscriptions.
            </p>
            <button className={styles.ctaBtn} onClick={() => navigate('/login')}>
              Create Free Account →
            </button>
            <p className={styles.ctaNote}>✓ Free forever &nbsp; ✓ No credit card &nbsp; ✓ 30-second signup</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <span>🛡️</span> Safe<em>Her</em>
            </div>
            <p className={styles.footerTagline}>
              Women Safety &amp; Emergency Assistance Platform.<br />
              100% Free. Always.
            </p>
            <div className={styles.footerHelplines}>
              <p style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.75rem' }}>Emergency Helplines</p>
              <div className={styles.helplineGrid}>
                {[['Police', '100'], ['Women', '181'], ['Ambulance', '108'], ['Cyber', '1930']].map(([l, n]) => (
                  <a key={l} href={`tel:${n}`} className={styles.helplineItem}>
                    <strong>{n}</strong><span>{l}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footerLinks}>
            {/* Platform column */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColHead}>Platform</h4>
              <button className={styles.footerLink} onClick={() => scrollTo('Features')}>Features</button>
              <button className={styles.footerLink} onClick={() => scrollTo('Safety Map')}>Safety Map</button>
              <button className={styles.footerLink} onClick={() => handleFeatureClick('/home')}>SOS System</button>
              <button className={styles.footerLink} onClick={() => handleFeatureClick('/community')}>Community Chat</button>
              <button className={styles.footerLink} onClick={() => handleFeatureClick('/admin')}>Admin Dashboard</button>
            </div>

            {/* Support column */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColHead}>Support</h4>
              <button className={styles.footerLink} onClick={() => scrollTo('How It Works')}>How It Works</button>
              <button className={styles.footerLink} onClick={() => setShowFaq(true)}>FAQ</button>
              <button className={styles.footerLink} onClick={() => window.open('mailto:support@safeher.app')}>Contact Us</button>
              <button className={styles.footerLink} onClick={() => window.open('mailto:bugs@safeher.app?subject=Bug Report')}>Report a Bug</button>
              <button className={styles.footerLink} onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
            </div>

            {/* Resources column */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColHead}>Resources</h4>
              <button className={styles.footerLink} onClick={() => scrollTo('Features')}>Safety Tips</button>
              <button className={styles.footerLink} onClick={() => window.open('https://nalsa.gov.in', '_blank')}>Legal Rights</button>
              <button className={styles.footerLink} onClick={() => window.open('https://ncw.nic.in', '_blank')}>NGO Partners</button>
              <button className={styles.footerLink} onClick={() => window.open('http://localhost:5000/api/health', '_blank')}>API Docs</button>
              <button className={styles.footerLink} onClick={() => window.open('https://github.com', '_blank')}>Open Source</button>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© 2024 SafeHer. Made with ❤️ for women's safety. All rights reserved.</p>
          <p>Free &amp; Open Source · No Ads · No Subscriptions</p>
        </div>
      </footer>

      {/* ── MOBILE SECTION NAVIGATOR ─────────────────────────── */}
      <div className={styles.mobileNav}>
        <button
          className={styles.mobileNavArrow}
          onClick={goToPrevSection}
          disabled={currentSectionIdx === 0}
          aria-label="Previous section"
        >
          ‹
        </button>

        <div className={styles.mobileNavCenter}>
          <div className={styles.mobileNavDots}>
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                className={`${styles.mobileNavDot} ${i === currentSectionIdx ? styles.mobileNavDotActive : ''}`}
                onClick={() => {
                  const el = document.getElementById(sectionIds[i]);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                aria-label={`Go to ${SECTIONS[i]}`}
              />
            ))}
          </div>
          <span className={styles.mobileNavLabel}>{SECTIONS[currentSectionIdx]}</span>
        </div>

        <button
          className={styles.mobileNavArrow}
          onClick={goToNextSection}
          disabled={currentSectionIdx === SECTIONS.length - 1}
          aria-label="Next section"
        >
          ›
        </button>
      </div>

      {/* ── SCROLL TO TOP (mobile + desktop) ─────────────────── */}
      {showScrollTop && (
        <button
          className={styles.scrollTopBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}

      {/* ── SUBMIT TESTIMONIAL MODAL ──────────────────────────── */}
      {showTestimonialForm && (
        <div className={styles.modalOverlay} onClick={() => setShowTestimonialForm(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <h2 className={styles.modalTitle}>Share Your Story ✍️</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--mid)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Your testimonial will appear on the landing page after review by our team.
            </p>
            <form onSubmit={handleSubmitTestimonial}>
              {/* Star Rating */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.testLabel}>Your Rating</label>
                <div className={styles.starRow}>
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`${styles.starBtn} ${testimonialForm.rating >= star ? styles.starActive : ''}`}
                      onClick={() => setTestimonialForm(f => ({ ...f, rating: star }))}
                    >★</button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.testLabel}>Your City / Location</label>
                <input
                  className={styles.testInput}
                  placeholder="e.g. Mumbai, Maharashtra"
                  value={testimonialForm.location}
                  onChange={e => setTestimonialForm(f => ({ ...f, location: e.target.value }))}
                  maxLength={60}
                />
              </div>

              {/* Testimonial text */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.testLabel}>Your Experience</label>
                <textarea
                  className={styles.testTextarea}
                  placeholder="Tell us how SafeHer helped you or someone you know..."
                  value={testimonialForm.text}
                  onChange={e => setTestimonialForm(f => ({ ...f, text: e.target.value }))}
                  maxLength={500}
                  rows={4}
                />
                <span style={{ fontSize: '0.68rem', color: '#bbb', float: 'right' }}>
                  {testimonialForm.text.length}/500
                </span>
              </div>

              {/* Anonymous toggle */}
              <div
                className={styles.testAnonRow}
                onClick={() => setTestimonialForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
              >
                <div className={`${styles.testToggle} ${testimonialForm.isAnonymous ? styles.testToggleOn : ''}`}>
                  <div className={styles.testKnob} />
                </div>
                <div>
                  <strong>Post Anonymously</strong>
                  <span>Your name will show as "Anonymous"</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowTestimonialForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalClose}
                  disabled={submittingTest}
                  style={{ flex: 2 }}
                >
                  {submittingTest ? 'Submitting...' : 'Submit Testimonial 💗'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FAQ MODAL ─────────────────────────────────────────── */}
      {showFaq && (
        <div className={styles.modalOverlay} onClick={() => setShowFaq(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <h2 className={styles.modalTitle}>Frequently Asked Questions</h2>
            <div className={styles.faqList}>
              {[
                { q: 'Is SafeHer completely free?', a: 'Yes! SafeHer is 100% free with no subscriptions, no ads, and no hidden charges — ever.' },
                { q: 'How does the SOS alert work?', a: 'Tap the SOS button and your emergency contacts instantly receive an SMS and email with your live GPS location.' },
                { q: 'Is my location always being tracked?', a: 'No. Location is only shared when you enable Live Location or trigger SOS. You are always in control.' },
                { q: 'Can I report anonymously?', a: 'Yes. Toggle "Report Anonymously" when submitting an incident and your identity will not be shown.' },
                { q: 'Who verifies the incident reports?', a: 'Our admin/moderator team reviews all reports within 30 minutes before they appear on the Safety Map.' },
                { q: 'How do I become an admin?', a: 'Admin access is assigned manually in the database. Contact the platform owner to request access.' },
              ].map(({ q, a }, i) => (
                <div key={i} className={styles.faqItem}>
                  <p className={styles.faqQ}>Q: {q}</p>
                  <p className={styles.faqA}>A: {a}</p>
                </div>
              ))}
            </div>
            <button className={styles.modalClose} onClick={() => setShowFaq(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ── PRIVACY POLICY MODAL ──────────────────────────────── */}
      {showPrivacy && (
        <div className={styles.modalOverlay} onClick={() => setShowPrivacy(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <h2 className={styles.modalTitle}>Privacy Policy</h2>
            <div className={styles.privacyContent}>
              {[
                { title: 'Data We Collect', text: 'We collect your name, email, phone number, and location only when you enable location sharing or trigger SOS.' },
                { title: 'How We Use Your Data', text: 'Your data is used solely to provide safety features — SOS alerts, incident reporting, and the safety map. We never sell your data.' },
                { title: 'Location Data', text: 'Location is only accessed when you explicitly enable it or trigger SOS. It is never tracked in the background without your consent.' },
                { title: 'Emergency Contacts', text: 'Your emergency contacts\' details are stored securely and only used to send SOS notifications on your behalf.' },
                { title: 'Data Security', text: 'All data is encrypted in transit (HTTPS) and at rest. Passwords are hashed using bcrypt with 12 salt rounds.' },
                { title: 'Your Rights', text: 'You can delete your account and all associated data at any time by contacting support@safeher.app.' },
                { title: 'Contact', text: 'For privacy concerns, email us at privacy@safeher.app.' },
              ].map(({ title, text }, i) => (
                <div key={i} className={styles.privacyItem}>
                  <p className={styles.privacyTitle}>{title}</p>
                  <p className={styles.privacyText}>{text}</p>
                </div>
              ))}
            </div>
            <button className={styles.modalClose} onClick={() => setShowPrivacy(false)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;