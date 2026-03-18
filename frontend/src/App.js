import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import LandingPage    from './pages/LandingPage';
import AuthPage       from './pages/AuthPage';
import OnboardingPage      from './pages/OnboardingPage';
import ForgotPasswordPage  from './pages/ForgotPasswordPage';
import ResetPasswordPage   from './pages/ResetPasswordPage';
import LiveSharePage       from './pages/LiveSharePage';
import TrackPage           from './pages/TrackPage';
import HomePage       from './pages/HomePage';
import MapPage        from './pages/MapPage';
import ReportPage     from './pages/ReportPage';
import ContactsPage   from './pages/ContactsPage';
import AdminPage      from './pages/AdminPage';
import ProfilePage    from './pages/ProfilePage';
import SOSHistoryPage from './pages/SOSHistoryPage';
import CommunityPage  from './pages/CommunityPage';
import VolunteerPage  from './pages/VolunteerPage';

// Layout
import BottomNav       from './components/layout/BottomNav';
import LiveAlertBanner from './components/layout/LiveAlertBanner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🛡️</div>
        <p style={{ color:'var(--primary)', fontWeight:800, fontSize:'1.2rem' }}>SafeHer</p>
        <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.5rem' }}>Loading your safety dashboard...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1A0A0F' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚙️</div>
        <p style={{ color:'#C2185B', fontWeight:800, fontSize:'1.1rem' }}>Admin Panel</p>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', marginTop:'0.5rem' }}>Verifying access...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'moderator') {
    console.warn('⛔ Admin access denied — role:', user.role);
    return <Navigate to="/home" replace />;
  }
  console.log('✅ Admin access granted — role:', user.role);
  return children;
};

const AppInner = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Onboarding — always full screen, even when authenticated
  if (location.pathname === '/onboarding') {
    return (
      <>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar closeOnClick pauseOnHover={false} draggable={false} />
      </>
    );
  }

  const isPublic =
    ['/', '/login', '/forgot-password'].includes(location.pathname) ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/track');

  // Public pages — full width, no mobile shell
  if (isPublic) {
    return (
      <>
        <Routes>
          <Route path="/"                      element={user ? <Navigate to="/home" replace /> : <LandingPage />} />
          <Route path="/login"                 element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
          <Route path="/forgot-password"       element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/track/:token"          element={<TrackPage />} />
          <Route path="*"                      element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar closeOnClick pauseOnHover={false} draggable={false} />
      </>
    );
  }

  // Authenticated app — 430px mobile shell
  return (
    <div className="app-shell">
      <LiveAlertBanner />
      <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', height:'100%' }}>
        <Routes>
          <Route path="/home"        element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/map"         element={<PrivateRoute><MapPage /></PrivateRoute>} />
          <Route path="/report"      element={<PrivateRoute><ReportPage /></PrivateRoute>} />
          <Route path="/contacts"    element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
          <Route path="/liveshare"   element={<PrivateRoute><LiveSharePage /></PrivateRoute>} />
          <Route path="/community"   element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
          <Route path="/volunteer"   element={<PrivateRoute><VolunteerPage /></PrivateRoute>} />
          <Route path="/profile"     element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/sos-history" element={<PrivateRoute><SOSHistoryPage /></PrivateRoute>} />
          <Route path="/admin"       element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*"            element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        style={{ top:'70px', zIndex:9999 }}
      />
    </div>
  );
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppInner />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;