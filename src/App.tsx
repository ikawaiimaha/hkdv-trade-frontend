import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ChatBubble from './components/ChatBubble';
import SupportFAB from './components/SupportFAB';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import AboutPage from './pages/AboutPage';
import HowToUsePage from './pages/HowToUsePage';
import FAQPage from './pages/FAQPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen" style={{ backgroundColor: '#FEEAF2' }}>
          <Navbar />

          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <PageWrapper>
                    <HomePage />
                  </PageWrapper>
                }
              />
              <Route
                path="/events"
                element={
                  <PageWrapper>
                    <EventsPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/about"
                element={
                  <PageWrapper>
                    <AboutPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/how-to-use"
                element={
                  <PageWrapper>
                    <HowToUsePage />
                  </PageWrapper>
                }
              />
              <Route
                path="/faq"
                element={
                  <PageWrapper>
                    <FAQPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/login"
                element={
                  <PageWrapper>
                    <LoginPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/signup"
                element={
                  <PageWrapper>
                    <SignupPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/profile"
                element={
                  <PageWrapper>
                    <ProfilePage />
                  </PageWrapper>
                }
              />
            </Routes>
          </AnimatePresence>

          {!isAuthPage && <ChatBubble />}
          {!isAuthPage && <SupportFAB />}
        </div>
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
