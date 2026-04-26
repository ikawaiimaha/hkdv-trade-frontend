import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useToast } from './ToastProvider';

const navItems = [
  { path: '/', label: 'Marketplace' },
  { path: '/events', label: 'Events' },
  { path: '/about', label: 'About' },
  { path: '/how-to-use', label: 'How To Use' },
  { path: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-14 transition-shadow duration-200 ${
        scrolled ? 'shadow-lg shadow-pink-900/10' : ''
      }`}
      style={{ backgroundColor: '#FB88A3' }}
    >
      <div className="max-w-content mx-auto h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
          <img src="/mascot-idle.png" alt="HKDV" className="w-8 h-8 object-contain" />
          <span className="hidden sm:inline">HKDV Trade</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative px-3 py-1.5 rounded-full text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/15"
            >
              {location.pathname === item.path && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-white/20 border border-white/10"
                  transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Join / Log In button */}
        <button
          onClick={() => showToast('Join / Log In coming soon! 🎀', 'info')}
          className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-white/70 text-white text-sm font-semibold hover:bg-white/15 transition-colors duration-200"
        >
          <img src="/mascot-idle.png" alt="" className="w-5 h-5 object-contain" />
          Join / Log In
        </button>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden absolute top-14 left-0 right-0 shadow-xl"
          style={{ backgroundColor: '#FB88A3' }}
        >
          <div className="flex flex-col p-3 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-2 ${
                  location.pathname === item.path ? 'bg-white/20' : 'hover:bg-white/15'
                }`}
              >
                {location.pathname === item.path && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => showToast('Join / Log In coming soon! 🎀', 'info')}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-white/80 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
            >
              <img src="/mascot-idle.png" alt="" className="w-5 h-5 object-contain" />
              Join / Log In
            </button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
