import { motion } from 'framer-motion';
import { Shield, Lock, AlertTriangle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface InvitationGateProps {
  children: React.ReactNode;
  requireApproval?: boolean;
}

export default function InvitationGate({ children, requireApproval = true }: InvitationGateProps) {
  const { trader, isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-[20px] mb-3" style={{ backgroundColor: '#FFEAF3' }} />
          <div className="w-24 h-3 rounded" style={{ backgroundColor: '#FFEAF3' }} />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <Shield size={48} className="mx-auto mb-4" style={{ color: '#FF8CC6' }} />
          <h1 className="text-h1 mb-2">Invite Only</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            MomoMint is an invite-only community for verified HKDV players. Log in with an approved account to access trading.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
              style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2.5 rounded-full text-[13px] font-bold border"
              style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
            >
              Apply
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // User is logged in but not approved
  if (requireApproval && trader?.status !== 'active') {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          {trader?.status === 'pending' ? (
            <>
              <Sparkles size={48} className="mx-auto mb-4" style={{ color: '#FF8CC6' }} />
              <h1 className="text-h1 mb-2">Pending Approval</h1>
              <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
                Your HKDV account verification is being reviewed by an admin. You'll be notified when approved.
              </p>
              <div className="rounded-[20px] p-4 border text-left" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                <div className="flex items-center gap-2 text-[12px] font-bold mb-2" style={{ color: '#8A6A00' }}>
                  <AlertTriangle size={14} /> What you can do now:
                </div>
                <ul className="text-[12px] space-y-1" style={{ color: '#7A4A68' }}>
                  <li>• Browse collections and events</li>
                  <li>• Edit your profile</li>
                  <li>• Wait for admin approval</li>
                </ul>
              </div>
              <Link
                to="/"
                className="inline-block mt-6 px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
                style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
              >
                Browse Collections
              </Link>
            </>
          ) : (
            <>
              <Lock size={48} className="mx-auto mb-4" style={{ color: '#D97A4E' }} />
              <h1 className="text-h1 mb-2">Account Locked</h1>
              <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
                Your account requires HKDV verification and admin approval before you can trade. Please complete the verification process.
              </p>
              <Link
                to="/verify"
                className="inline-block px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
                style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
              >
                Verify HKDV Account
              </Link>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
