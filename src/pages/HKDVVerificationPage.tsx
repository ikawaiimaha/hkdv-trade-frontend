import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Shield, Upload, CheckCircle, Sparkles, Ticket, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabase';

export default function HKDVVerificationPage() {
  const { trader, isLoggedIn, refreshTrader } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [hkdvPlayerId, setHkdvPlayerId] = useState('');
  const [hkdvDisplayName, setHkdvDisplayName] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <Shield size={48} className="mx-auto mb-4" style={{ color: '#FF8CC6' }} />
          <h1 className="text-h1 mb-2">Log In Required</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            Please log in or sign up before verifying your HKDV account.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image too large. Max 2MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!trader) return;
    if (!inviteCode.trim() || !hkdvPlayerId.trim() || !hkdvDisplayName.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('submit_hkdv_verification', {
        p_invitation_code: inviteCode.trim(),
        p_hkdv_player_id: hkdvPlayerId.trim(),
        p_hkdv_display_name: hkdvDisplayName.trim(),
        p_proof_image_url: proofImage,
      });

      if (error) {
        showToast(error.message || 'Verification failed', 'error');
        setIsSubmitting(false);
        return;
      }

      showToast('Application submitted! Pending admin review.', 'success');
      await refreshTrader();
      setStep(3); // Go to pending screen
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    // Step 0: Invitation Code
    {
      title: 'Invitation Code',
      subtitle: 'MomoMint is invite-only. Enter your code to continue.',
      icon: Ticket,
      content: (
        <div className="py-4">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
            >
              🎟️
            </motion.div>
            <p className="text-[14px] font-bold mb-1" style={{ color: '#4A1838' }}>
              Have an invitation?
            </p>
            <p className="text-[12px]" style={{ color: '#7A4A68' }}>
              MomoMint is a private community for verified HKDV collectors.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-bold block mb-1.5" style={{ color: '#4A1838' }}>
                Invitation Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123XYZ"
                className="w-full px-4 py-3 rounded-[16px] text-[14px] font-bold text-center border-2 border-transparent focus:outline-none tracking-widest uppercase"
                style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
              />
              <p className="text-[10px] font-bold mt-1" style={{ color: '#B08AA0' }}>
                Codes are single-use and case-insensitive
              </p>
            </div>
          </div>
        </div>
      ),
      canProceed: () => inviteCode.trim().length >= 6,
      action: { label: 'Continue', onClick: () => setStep(1) },
    },

    // Step 1: Link HKDV Account
    {
      title: 'Link HKDV Account',
      subtitle: 'Prove your in-game identity to keep trades safe.',
      icon: Shield,
      content: (
        <div className="py-4 space-y-3">
          <div className="text-center mb-4">
            <p className="text-[14px] font-bold mb-1" style={{ color: '#4A1838' }}>
              One HKDV account per trader
            </p>
            <p className="text-[11px]" style={{ color: '#7A4A68' }}>
              This prevents scams and duplicate accounts. Your proof is reviewed by an admin.
            </p>
          </div>

          <div>
            <label className="text-[12px] font-bold block mb-1.5" style={{ color: '#4A1838' }}>
              HKDV Player ID
            </label>
            <input
              type="text"
              value={hkdvPlayerId}
              onChange={(e) => setHkdvPlayerId(e.target.value)}
              placeholder="Your in-game player ID"
              className="w-full px-3 py-2.5 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
              style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
            />
          </div>

          <div>
            <label className="text-[12px] font-bold block mb-1.5" style={{ color: '#4A1838' }}>
              HKDV Display Name
            </label>
            <input
              type="text"
              value={hkdvDisplayName}
              onChange={(e) => setHkdvDisplayName(e.target.value)}
              placeholder="Your in-game name"
              className="w-full px-3 py-2.5 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
              style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
            />
          </div>

          <div>
            <label className="text-[12px] font-bold block mb-1.5" style={{ color: '#4A1838' }}>
              Proof Screenshot
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-[13px] font-bold border border-dashed transition-colors hover:bg-[#FFEAF3]"
              style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
            >
              {proofImage ? (
                <>
                  <CheckCircle size={16} /> Proof uploaded
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload profile screenshot
                </>
              )}
            </button>
            <p className="text-[10px] font-bold mt-1" style={{ color: '#B08AA0' }}>
              Screenshot your HKDV profile showing your player ID and name. Max 2MB.
            </p>
            {proofImage && (
              <div className="mt-2 rounded-[12px] overflow-hidden border" style={{ borderColor: '#FFD6EC' }}>
                <img src={proofImage} alt="Proof" className="w-full h-32 object-cover" />
              </div>
            )}
          </div>
        </div>
      ),
      canProceed: () => hkdvPlayerId.trim().length > 0 && hkdvDisplayName.trim().length > 0,
      action: { label: 'Submit Application', onClick: handleSubmit },
      back: () => setStep(0),
    },

    // Step 2: Pending (this shouldn't appear as step, but used for completion state)
    {
      title: 'Application Sent',
      subtitle: 'An admin will review your HKDV account.',
      icon: Sparkles,
      content: null,
      canProceed: () => false,
      action: { label: 'Done', onClick: () => navigate('/') },
    },
  ];

  // If trader is already pending or approved, show status screen
  if (trader?.status === 'pending') {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <Sparkles size={48} className="mx-auto mb-4" style={{ color: '#FF8CC6' }} />
          <h1 className="text-h1 mb-2">Pending Approval</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            Your HKDV verification is being reviewed by an admin. You'll get access to trading once approved.
          </p>
          <div className="rounded-[20px] p-4 border mb-6 text-left" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <div className="flex items-center gap-2 text-[12px] font-bold mb-2" style={{ color: '#8A6A00' }}>
              <Lock size={14} /> Restricted until approved:
            </div>
            <ul className="text-[12px] space-y-1.5" style={{ color: '#7A4A68' }}>
              <li>❌ Posting trade listings</li>
              <li>❌ Sending trade offers</li>
              <li>❌ Viewing trader profiles in Discover</li>
              <li>✅ Browsing collections and items</li>
              <li>✅ Building your wishlist</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            Browse Collections
          </button>
        </motion.div>
      </div>
    );
  }

  // Already approved
  if (trader?.status === 'active') {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#2FAF7F' }} />
          <h1 className="text-h1 mb-2">Verified!</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            Your HKDV account is verified. You're ready to trade!
          </p>
          <button
            onClick={() => navigate('/trades')}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            Find Trades
          </button>
        </motion.div>
      </div>
    );
  }

  const currentStep = steps[step];

  return (
    <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] rounded-[28px] p-6 border shadow-soft-lg"
        style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: '#FF3B93' }} />
              <h2 className="text-[15px] font-bold" style={{ color: '#4A1838' }}>{currentStep.title}</h2>
            </div>
            <span className="text-[11px] font-bold" style={{ color: '#B08AA0' }}>Step {step + 1} of 2</span>
          </div>
          <p className="text-[12px]" style={{ color: '#B08AA0' }}>{currentStep.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 32 : 12,
                backgroundColor: i <= step ? '#FF8CC6' : '#FFEAF3',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {currentStep.content}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          {currentStep.back && (
            <button
              onClick={currentStep.back}
              className="flex items-center justify-center gap-2 px-4 h-10 rounded-full text-[12px] font-bold border transition-colors hover:bg-[#FFEAF3]"
              style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={currentStep.action.onClick}
            disabled={isSubmitting || !currentStep.canProceed()}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-[12px] font-bold text-white shadow-soft disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                {currentStep.action.label} <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
