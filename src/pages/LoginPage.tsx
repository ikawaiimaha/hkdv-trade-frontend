import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    setIsSubmitting(true);
    const { error } = await login(username.trim(), passcode.trim());
    setIsSubmitting(false);

    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Welcome back! 🎀', 'success');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pt-14 pb-20 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-hkdv-pink text-sm font-semibold mb-6 hover:opacity-80 transition-opacity">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <img src="/mascot-idle.png" alt="HKDV Mascot" className="w-20 h-20 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-extrabold text-hkdv-text mb-2">Welcome Back!</h1>
          <p className="text-sm text-hkdv-text-secondary">Log in to your HKDV Trade account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-card-md border border-pink-100/50 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Passcode</label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter your passcode"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hkdv-text-muted hover:text-hkdv-text transition-colors"
              >
                {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-3 rounded-xl font-bold text-sm shadow-float hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="animate-spin">&#x1F380;</span>
            ) : (
              <LogIn size={16} />
            )}
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>

          <div className="text-center pt-2">
            <p className="text-sm text-hkdv-text-secondary">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-bold text-hkdv-pink hover:text-hkdv-pink-dark transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </form>

        {/* Decorative footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Sparkles size={14} className="text-hkdv-yellow" />
          <span className="text-xs text-hkdv-text-muted">Happy trading!</span>
          <Sparkles size={14} className="text-hkdv-yellow" />
        </div>
      </motion.div>
    </div>
  );
}
