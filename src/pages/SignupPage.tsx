import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Sparkles, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const buddies = [
  'Hello Kitty',
  'My Melody',
  'Little Twin Stars (Kiki & Lala)',
  'Tuxedosam',
  'Cinnamoroll',
  'Pompompurin',
  'Pochacco',
  'Kuromi',
  'Gudetama',
  'Badtz-Maru',
  'Wish me mell',
  'Cogimyun',
  'Kerokerokeroppi',
  'Hangyodon',
  'Ahiru No Pekkle',
];

export default function SignupPage() {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    passcode: '',
    confirmPasscode: '',
    buddyName: '',
    applicationNote: '',
  });
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.username.trim() || !form.displayName.trim()) {
        showToast('Please fill in username and display name', 'warning');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.passcode.trim() || form.passcode !== form.confirmPasscode) {
        showToast('Passcodes must match', 'warning');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signup({
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      email: form.email.trim() || undefined,
      passcode: form.passcode.trim(),
      buddyName: form.buddyName || undefined,
      applicationNote: form.applicationNote.trim() || undefined,
    });
    setIsSubmitting(false);

    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Welcome to HKDV Trade! Your account is pending approval 🎀', 'success');
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
          <h1 className="text-2xl font-extrabold text-hkdv-text mb-2">Join HKDV Trade</h1>
          <p className="text-sm text-hkdv-text-secondary">Create your collector account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step
                  ? 'bg-hkdv-pink text-white'
                  : s < step
                  ? 'bg-hkdv-pink/20 text-hkdv-pink'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <Check size={14} /> : s}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-card-md border border-pink-100/50 space-y-4">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="Choose a unique username"
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Display Name *</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="How others will see you"
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="For notifications"
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-3 rounded-xl font-bold text-sm shadow-float hover:shadow-lg transition-all"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Passcode *</label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={form.passcode}
                    onChange={(e) => updateField('passcode', e.target.value)}
                    placeholder="Create a passcode"
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

              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Confirm Passcode *</label>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={form.confirmPasscode}
                  onChange={(e) => updateField('confirmPasscode', e.target.value)}
                  placeholder="Repeat your passcode"
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl border-2 border-hkdv-pink/20 text-hkdv-text font-bold text-sm hover:bg-hkdv-pink/5 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-3 rounded-xl font-bold text-sm shadow-float hover:shadow-lg transition-all"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Buddy (optional)</label>
                <select
                  value={form.buddyName}
                  onChange={(e) => updateField('buddyName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select your buddy</option>
                  {buddies.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-hkdv-text mb-1.5">Application Note (optional)</label>
                <textarea
                  value={form.applicationNote}
                  onChange={(e) => updateField('applicationNote', e.target.value)}
                  placeholder="Tell us about yourself as a collector..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-hkdv-body text-hkdv-text placeholder:text-hkdv-text-muted border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl border-2 border-hkdv-pink/20 text-hkdv-text font-bold text-sm hover:bg-hkdv-pink/5 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-3 rounded-xl font-bold text-sm shadow-float hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="animate-spin">&#x1F380;</span>
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {isSubmitting ? 'Creating...' : 'Sign Up'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="text-center pt-2">
            <p className="text-sm text-hkdv-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-hkdv-pink hover:text-hkdv-pink-dark transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </form>

        {/* Decorative footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Sparkles size={14} className="text-hkdv-yellow" />
          <span className="text-xs text-hkdv-text-muted">Welcome to the community!</span>
          <Sparkles size={14} className="text-hkdv-yellow" />
        </div>
      </motion.div>
    </div>
  );
}
