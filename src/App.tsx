import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import ChatBubble from './components/ChatBubble';
import SupportFAB from './components/SupportFAB';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import AboutPage from './pages/AboutPage';
import HowToUsePage from './pages/HowToUsePage';
import FAQPage from './pages/FAQPage';

export default function App() {
  const location = useLocation();

  return (
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
        </Routes>
      </AnimatePresence>

      <ChatBubble />
      <SupportFAB />
    </div>
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
