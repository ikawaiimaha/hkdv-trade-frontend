import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ChatBubble from './components/ChatBubble';
import SupportFAB from './components/SupportFAB';
import InvitationGate from './components/InvitationGate';
import OnboardingModal, { isOnboardingComplete } from './components/OnboardingModal';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import AboutPage from './pages/AboutPage';
import HowToUsePage from './pages/HowToUsePage';
import FAQPage from './pages/FAQPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import CollectionPage from './pages/CollectionPage';
import TradesPage from './pages/TradesPage';
import BadgesPage from './pages/BadgesPage';
import HKDVVerificationPage from './pages/HKDVVerificationPage';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const location = useLocation();
  const { isLoggedIn, isApproved } = useAuth();
  const isAuthPage = ['/login', '/signup', '/verify'].includes(location.pathname);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isLoggedIn && isApproved && !isOnboardingComplete()) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, isApproved]);

  return (
    <div className="min-h-screen bg-momo-bg" style={{ color: '#4A1838' }}>
      <Navbar />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes — anyone can see */}
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/events" element={<PageWrapper><EventsPage /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          <Route path="/how-to-use" element={<PageWrapper><HowToUsePage /></PageWrapper>} />
          <Route path="/faq" element={<PageWrapper><FAQPage /></PageWrapper>} />
          <Route path="/collection/:id" element={<PageWrapper><CollectionPage /></PageWrapper>} />
          <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
          <Route path="/signup" element={<PageWrapper><SignupPage /></PageWrapper>} />
          <Route path="/verify" element={<PageWrapper><HKDVVerificationPage /></PageWrapper>} />

          {/* Protected routes — require approval */}
          <Route path="/profile" element={<PageWrapper><InvitationGate><ProfilePage /></InvitationGate></PageWrapper>} />
          <Route path="/trades" element={<PageWrapper><InvitationGate><TradesPage /></InvitationGate></PageWrapper>} />
          <Route path="/badges" element={<PageWrapper><InvitationGate><BadgesPage /></InvitationGate></PageWrapper>} />

          {/* Admin only */}
          <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        </Routes>
      </AnimatePresence>

      {!isAuthPage && <ChatBubble />}
      {!isAuthPage && <SupportFAB />}

      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
