import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const { trader, isLoggedIn, logout } = useAuth();
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
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully. See you soon! 👋', 'success');
  };

  // Strawberry titles by rank
  const getStrawberryTitle = (rank: number) => {
    const titles = [
      'Strawberry Syrup',
      'Strawberry Cookie',
      'Strawberry Macaron',
      'Strawberry Milk',
      'Strawberry Parfait',
      'Strawberry Cake',
    ];
    return titles[Math.min(rank, titles.length - 1)] || 'Strawberry Syrup';
  };

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

        {/* Right side - Auth state */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn && trader ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm overflow-hidden">
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>🎀</span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">{trader.display_name}</p>
                  <p className="text-[10px] text-white/70 leading-tight flex items-center gap-1">
                    <Sparkles size={8} />
                    {getStrawberryTitle(trader.strawberry_rank)}
                  </p>
                </div>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-card-lg border border-pink-100/50 py-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-pink-100/30">
                    <p className="text-sm font-bold text-hkdv-text">{trader.display_name}</p>
                    <p className="text-xs text-hkdv-text-muted">@{trader.username}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-medium text-hkdv-pink">
                        🍓 Rank {trader.strawberry_rank}
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-hkdv-text hover:bg-pink-50 transition-colors"
                  >
                    <User size={14} />
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full border-2 border-white/70 text-white text-sm font-semibold hover:bg-white/15 transition-colors duration-200"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded-full bg-white text-hkdv-pink-dark text-sm font-bold hover:bg-white/90 transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

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
            {/* Mobile user info */}
            {isLoggedIn && trader && (
              <div className="px-4 py-3 mb-2 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                    {trader.avatar_url ? (
                      <img src={trader.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>🎀</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{trader.display_name}</p>
                    <p className="text-xs text-white/70">🍓 Rank {trader.strawberry_rank}</p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Mobile auth buttons */}
            <div className="mt-3 pt-3 border-t border-white/20 flex flex-col gap-2">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-white/80 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-white/80 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white text-hkdv-pink-dark text-sm font-bold hover:bg-white/90 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
