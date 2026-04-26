import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) { showToast('Please fill in all fields', 'warning'); return; }
    setIsSubmitting(true);
    const { error } = await login(username.trim(), passcode.trim(), stayLoggedIn);
    setIsSubmitting(false);
    if (error) { showToast(error, 'error'); }
    else { showToast('Welcome back! 🎀', 'success'); navigate('/'); }
  };

  return (
    <div className="min-h-screen pt-[60px] pb-20 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <img src="/momo-happy.png" alt="Momo" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-h1 mb-1">Welcome Back!</h1>
          <p className="text-body" style={{ color: '#7A4A68' }}>Log in to your MomoMint account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[24px] p-5 border space-y-4 shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: '#4A1838' }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username"
              className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none transition-colors"
              style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
          </div>
          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: '#4A1838' }}>Passcode</label>
            <div className="relative">
              <input type={showPasscode ? 'text' : 'password'} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Your passcode"
                className="w-full px-4 py-3 pr-12 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none transition-colors"
                style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              <button type="button" onClick={() => setShowPasscode(!showPasscode)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#B08AA0' }}>
                {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <div className="relative">
              <input type="checkbox" checked={stayLoggedIn} onChange={(e) => setStayLoggedIn(e.target.checked)} className="sr-only peer" />
              <div className="w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center peer-checked:border-[#FF8CC6]"
                style={{ borderColor: stayLoggedIn ? '#FF8CC6' : '#FFD6EC', backgroundColor: stayLoggedIn ? '#FF8CC6' : '#FFF6FA' }}>
                {stayLoggedIn && <Check size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-[12px] font-bold select-none" style={{ color: '#7A4A68' }}>Stay logged in</span>
          </label>

          <button type="submit" disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 h-[44px] rounded-full text-[13px] font-bold text-white shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
            {isSubmitting ? '...' : <><LogIn size={16} /> Log In</>}
          </button>

          <div className="text-center">
            <p className="text-[12px] font-bold" style={{ color: '#7A4A68' }}>
              No account? <Link to="/signup" className="font-bold hover:underline" style={{ color: '#FF3B93' }}>Sign up</Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
