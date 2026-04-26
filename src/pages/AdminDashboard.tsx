import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, CheckCircle, XCircle, Ticket, Loader2, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { usePendingApplications } from '../hooks/useHKDVVerification';
import { useInvitationCodes } from '../hooks/useHKDVVerification';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const { trader, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const isAdmin = trader?.is_admin === true;

  const { applications, loading: appsLoading, refetch: refetchApps } = usePendingApplications(isAdmin);
  const { codes, loading: codesLoading, generateCode } = useInvitationCodes(isAdmin);

  const [activeTab, setActiveTab] = useState<'verifications' | 'invites'>('verifications');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4" style={{ color: '#FF8CC6' }} />
          <h1 className="text-h1 mb-2">Admin Only</h1>
          <p className="text-body" style={{ color: '#7A4A68' }}>Please log in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <Shield size={48} className="mx-auto mb-4" style={{ color: '#D97A4E' }} />
          <h1 className="text-h1 mb-2">Access Denied</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            This area is restricted to MomoMint administrators.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const handleApprove = async (accountId: string) => {
    setProcessingId(accountId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('admin_approve_hkdv_account', { p_account_id: accountId });
      if (error) throw error;
      showToast('Trader approved! 🎉', 'success');
      await refetchApps();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (accountId: string) => {
    setProcessingId(accountId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('admin_reject_hkdv_account', { p_account_id: accountId });
      if (error) throw error;
      showToast('Trader rejected.', 'info');
      await refetchApps();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    const { code, error } = await generateCode();
    setGenerating(false);
    if (error) {
      showToast(error.message, 'error');
    } else if (code) {
      showToast(`Code generated: ${code}`, 'success');
      await navigator.clipboard.writeText(code);
      showToast('Copied to clipboard!', 'success');
    }
  };

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} style={{ color: '#FF3B93' }} />
            <h1 className="text-h1">Admin Dashboard</h1>
          </div>
          <p className="text-body" style={{ color: '#7A4A68' }}>
            Manage verifications and invitation codes.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-[16px] p-3 border text-center" style={{ backgroundColor: '#FFEAF3', borderColor: '#FFD6EC' }}>
            <p className="text-[22px] font-extrabold" style={{ color: '#FF3B93' }}>{applications.length}</p>
            <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Pending</p>
          </div>
          <div className="rounded-[16px] p-3 border text-center" style={{ backgroundColor: '#E7FFF4', borderColor: '#C8F5DC' }}>
            <p className="text-[22px] font-extrabold" style={{ color: '#2FAF7F' }}>{codes.filter(c => c.usedBy).length}</p>
            <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Used Codes</p>
          </div>
          <div className="rounded-[16px] p-3 border text-center" style={{ backgroundColor: '#F0E4FF', borderColor: '#E8D5FF' }}>
            <p className="text-[22px] font-extrabold" style={{ color: '#7B5EAA' }}>{codes.filter(c => !c.usedBy && c.isActive).length}</p>
            <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Available</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-[16px] mb-5" style={{ backgroundColor: '#FFEAF3' }}>
          {[
            { key: 'verifications' as const, label: 'Verifications', icon: Shield },
            { key: 'invites' as const, label: 'Invite Codes', icon: Ticket },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[12px] text-[11px] font-bold transition-all ${
                activeTab === tab.key ? 'text-white shadow-soft' : ''
              }`}
              style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' } : { color: '#7A4A68' }}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Verifications Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'verifications' && (
            <motion.div
              key="verifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {appsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[16px] h-32" style={{ backgroundColor: '#FFEAF3' }} />
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                  <CheckCircle size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#2FAF7F' }} />
                  <p className="text-body" style={{ color: '#B08AA0' }}>No pending verifications.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <motion.div
                      key={app.accountId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[20px] p-4 border"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#FFD6EC' }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
                          {app.traderAvatar ? (
                            <img src={app.traderAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-[12px] font-bold">
                              {app.traderName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-bold" style={{ color: '#4A1838' }}>{app.traderName}</h3>
                          <p className="text-[11px]" style={{ color: '#B08AA0' }}>@{app.traderUsername}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF7CC', color: '#8A6A00' }}>
                              HKDV: {app.hkdvDisplayName}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0E4FF', color: '#7B5EAA' }}>
                              ID: {app.hkdvPlayerId}
                            </span>
                            {app.invitationCode && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
                                Invite: {app.invitationCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {app.proofImageUrl && (
                        <div className="rounded-[12px] overflow-hidden mb-3 border" style={{ borderColor: '#FFD6EC' }}>
                          <img src={app.proofImageUrl} alt="Proof" className="w-full h-40 object-cover" />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(app.accountId)}
                          disabled={processingId === app.accountId}
                          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold border transition-colors hover:bg-red-50 disabled:opacity-50"
                          style={{ borderColor: '#FFD6EC', color: '#D97A4E' }}
                        >
                          {processingId === app.accountId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(app.accountId)}
                          disabled={processingId === app.accountId}
                          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold text-white shadow-soft disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
                        >
                          {processingId === app.accountId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'invites' && (
            <motion.div
              key="invites"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold" style={{ color: '#4A1838' }}>Invitation Codes</h3>
                <button
                  onClick={handleGenerateCode}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white shadow-soft disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Ticket size={12} />}
                  Generate Code
                </button>
              </div>

              {codesLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[16px] h-14" style={{ backgroundColor: '#FFEAF3' }} />
                  ))}
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-8 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                  <Ticket size={24} className="mx-auto mb-2 opacity-30" style={{ color: '#FF8CC6' }} />
                  <p className="text-body" style={{ color: '#B08AA0' }}>No invitation codes yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {codes.map((code) => (
                    <div
                      key={code.code}
                      className="flex items-center gap-3 p-3 rounded-[16px] border"
                      style={{ backgroundColor: code.usedBy ? '#FFF6FA' : '#FFFFFF', borderColor: '#FFD6EC', opacity: code.isActive ? 1 : 0.5 }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold font-mono" style={{ color: '#4A1838' }}>{code.code}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(code.code); showToast('Copied!', 'success'); }}
                            className="p-1 rounded hover:bg-[#FFEAF3] transition-colors"
                            style={{ color: '#B08AA0' }}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>
                          Uses: {code.useCount}/{code.maxUses} • {code.usedBy ? 'Used' : 'Available'}
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-bold px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: code.usedBy ? '#E7FFF4' : code.isActive ? '#FFF7CC' : '#FFEAF3',
                          color: code.usedBy ? '#2FAF7F' : code.isActive ? '#8A6A00' : '#B08AA0',
                        }}
                      >
                        {code.usedBy ? 'USED' : code.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
