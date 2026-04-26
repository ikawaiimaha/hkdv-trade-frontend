import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User, Bell, Award, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

const navItems = [
  { path: '/', label: 'Marketplace' },
  { path: '/trades', label: 'Trades' },
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
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const { trader, isLoggedIn, logout } = useAuth();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications(trader?.id);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out. See you soon! 👋', 'success');
  };

  const rankTitles = ['Strawberry Syrup', 'Strawberry Cookie', 'Strawberry Macaron', 'Strawberry Milk', 'Strawberry Parfait', 'Strawberry Cake'];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[60px] transition-shadow duration-200 ${
        scrolled ? 'shadow-soft' : ''
      }`}
      style={{ backgroundColor: '#FFF6FA' }}
    >
      <div className="max-w-content mx-auto h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight" style={{ color: '#4A1838' }}>
          <img src="/momo-idle.png" alt="Momo" className="w-8 h-8 object-contain" />
          <span className="hidden sm:inline">MomoMint</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200"
              style={{
                color: location.pathname === item.path ? '#FF3B93' : '#7A4A68',
                backgroundColor: location.pathname === item.path ? '#FFE3F1' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side - Auth */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn && trader ? (
            <>
              {/* Notification Bell */}
              <button
                onClick={() => setNotifPanelOpen(true)}
                className="relative p-2 rounded-full transition-colors hover:bg-[#FFE3F1]"
                style={{ color: '#4A1838' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                    style={{ backgroundColor: '#FF3B93' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors hover:bg-[#FFE3F1]"
                >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#FF8CC6] to-[#BFA2FF]">
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                      {trader.display_name?.[0]?.toUpperCase() || 'M'}
                    </div>
                  )}
                </div>
                <span className="text-[12px] font-bold" style={{ color: '#4A1838' }}>{trader.display_name}</span>
              </button>

              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-56 rounded-[20px] shadow-soft-lg border border-[#FFD6EC] py-2 z-50"
                  style={{ backgroundColor: '#FFF6FA' }}
                >
                  <div className="px-4 py-3 border-b border-[#FFD6EC]">
                    <p className="text-[13px] font-bold" style={{ color: '#4A1838' }}>{trader.display_name}</p>
                    <p className="text-[11px] font-bold" style={{ color: '#7A4A68' }}>@{trader.username}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-bold" style={{ color: '#FF3B93' }}>
                        🍓 {rankTitles[Math.min(trader.strawberry_rank, 5)] || 'Strawberry Syrup'}
                      </span>
                      {trader.status === 'pending' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFF7CC', color: '#8A6A00' }}>Pending</span>
                      )}
                      {trader.status === 'active' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#E7FFF4', color: '#2FAF7F' }}>Verified</span>
                      )}
                    </div>
                  </div>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#FFE3F1] transition-colors" style={{ color: '#4A1838' }}>
                    <User size={14} /> My Profile
                  </Link>
                  {trader.is_admin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#FFE3F1] transition-colors" style={{ color: '#FF3B93' }}>
                      <Shield size={14} /> Admin Dashboard
                    </Link>
                  )}
                  <Link to="/badges" className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#FFE3F1] transition-colors" style={{ color: '#4A1838' }}>
                    <Award size={14} /> Badges
                  </Link>
                  {trader.status !== 'active' && (
                    <Link to="/verify" className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#FFE3F1] transition-colors" style={{ color: '#FF3B93' }}>
                      <Shield size={14} /> Verify Account
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-red-50 transition-colors text-red-500">
                    <LogOut size={14} /> Log Out
                  </button>
                </motion.div>
              )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-colors"
                style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded-full text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: '#4A1838' }}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-[60px] left-0 right-0 shadow-soft-lg border-t border-[#FFD6EC]"
          style={{ backgroundColor: '#FFF6FA' }}
        >
          <div className="flex flex-col p-3 gap-1">
            {isLoggedIn && trader && (
              <div className="px-4 py-3 mb-2 border-b border-[#FFD6EC] flex items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF8CC6] to-[#BFA2FF]">
                  {trader.avatar_url ? (
                    <img src={trader.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">{trader.display_name[0]}</div>
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#4A1838' }}>{trader.display_name}</p>
                  <p className="text-[11px]" style={{ color: '#FF3B93' }}>🍓 Rank {trader.strawberry_rank}</p>
                </div>
              </div>
            )}
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold flex items-center gap-2 transition-colors"
                style={{
                  color: location.pathname === item.path ? '#FF3B93' : '#7A4A68',
                  backgroundColor: location.pathname === item.path ? '#FFE3F1' : 'transparent',
                }}>
                {item.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-[#FFD6EC] flex flex-col gap-2">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#FFD6EC] text-[13px] font-semibold text-red-500">
                  <LogOut size={16} /> Log Out
                </button>
              ) : (
                <>
                  <Link to="/login" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#FFD6EC] text-[13px] font-semibold" style={{ color: '#FF3B93' }}>Log In</Link>
                  <Link to="/signup" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Notification Panel */}
      <NotificationPanel isOpen={notifPanelOpen} onClose={() => setNotifPanelOpen(false)} />
    </nav>
  );
}
