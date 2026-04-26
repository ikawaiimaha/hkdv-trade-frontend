import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const buddies = ['Hello Kitty','My Melody','Cinnamoroll','Pompompurin','Kuromi','Gudetama','Pochacco','Tuxedosam','Badtz-Maru','Kerokerokeroppi','Hangyodon','Ahiru No Pekkle','Wish me mell','Cogimyun','Little Twin Stars'];

export default function SignupPage() {
  const [form, setForm] = useState({ username: '', displayName: '', email: '', passcode: '', confirmPasscode: '', buddyName: '', applicationNote: '' });
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const update = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleNext = () => {
    if (step === 1 && (!form.username.trim() || !form.displayName.trim())) { showToast('Fill in username and display name', 'warning'); return; }
    if (step === 2 && (!form.passcode.trim() || form.passcode !== form.confirmPasscode)) { showToast('Passcodes must match', 'warning'); return; }
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signup({ username: form.username.trim(), displayName: form.displayName.trim(), email: form.email.trim() || undefined, passcode: form.passcode.trim(), buddyName: form.buddyName || undefined, applicationNote: form.applicationNote.trim() || undefined });
    setIsSubmitting(false);
    if (error) showToast(error, 'error');
    else { showToast('Welcome to MomoMint! 🎀', 'success'); navigate('/'); }
  };

  return (
    <div className="min-h-screen pt-[60px] pb-20 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <img src="/momo-idle.png" alt="Momo" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-h1 mb-1">Join MomoMint</h1>
          <p className="text-body" style={{ color: '#7A4A68' }}>Create your collector account</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {[1,2,3].map(s => (
            <div key={s} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
              style={{ backgroundColor: s === step ? '#FF8CC6' : s < step ? '#FFE3F1' : '#FFEAF3', color: s === step ? '#FFF' : s < step ? '#FF3B93' : '#B08AA0' }}>
              {s < step ? <Check size={12} /> : s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="rounded-[24px] p-5 border space-y-4 shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold mb-1">Username *</label>
                <input type="text" value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="Unique username"
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div>
                <label className="block text-[12px] font-bold mb-1">Display Name *</label>
                <input type="text" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} placeholder="How others see you"
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div>
                <label className="block text-[12px] font-bold mb-1">Email (optional)</label>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="For notifications"
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <button type="button" onClick={handleNext} className="w-full h-[44px] rounded-full text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>Next</button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold mb-1">Passcode *</label>
                <div className="relative">
                  <input type={showPasscode ? 'text' : 'password'} value={form.passcode} onChange={(e) => update('passcode', e.target.value)} placeholder="Create passcode"
                    className="w-full px-4 py-3 pr-12 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
                  <button type="button" onClick={() => setShowPasscode(!showPasscode)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#B08AA0' }}>{showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold mb-1">Confirm Passcode *</label>
                <input type={showPasscode ? 'text' : 'password'} value={form.confirmPasscode} onChange={(e) => update('confirmPasscode', e.target.value)} placeholder="Repeat passcode"
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 h-[44px] rounded-full text-[13px] font-bold border" style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}>Back</button>
                <button type="button" onClick={handleNext} className="flex-1 h-[44px] rounded-full text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold mb-1">Buddy (optional)</label>
                <select value={form.buddyName} onChange={(e) => update('buddyName', e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none cursor-pointer" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}>
                  <option value="">Select buddy</option>
                  {buddies.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold mb-1">Note (optional)</label>
                <textarea value={form.applicationNote} onChange={(e) => update('applicationNote', e.target.value)} placeholder="Tell us about yourself..." rows={2}
                  className="w-full px-4 py-3 rounded-[20px] text-[13px] border-2 border-transparent focus:outline-none resize-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 h-[44px] rounded-full text-[13px] font-bold border" style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}>Back</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 h-[44px] rounded-full text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
                  {isSubmitting ? '...' : 'Sign Up'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="text-center pt-1">
            <p className="text-[12px] font-bold" style={{ color: '#7A4A68' }}>
              Have an account? <Link to="/login" className="font-bold hover:underline" style={{ color: '#FF3B93' }}>Log in</Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
