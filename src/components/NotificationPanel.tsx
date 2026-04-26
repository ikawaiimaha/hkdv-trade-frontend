import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, CheckCircle, Heart, Star,
  AlertTriangle, MessageCircle, Check
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  trade_offer: { icon: Heart, color: '#FF3B93', bg: '#FFE3F1', label: 'Trade Offer' },
  match_found: { icon: Star, color: '#8A6A00', bg: '#FFF7CC', label: 'Match Found' },
  trade_complete: { icon: CheckCircle, color: '#2FAF7F', bg: '#E7FFF4', label: 'Trade Complete' },
  offer_accepted: { icon: CheckCircle, color: '#2FAF7F', bg: '#E7FFF4', label: 'Offer Accepted' },
  offer_rejected: { icon: AlertTriangle, color: '#D97A4E', bg: '#FFF0E8', label: 'Offer Rejected' },
  message: { icon: MessageCircle, color: '#7B5EAA', bg: '#F0E4FF', label: 'Message' },
  system: { icon: Bell, color: '#7A4A68', bg: '#FFEAF3', label: 'System' },
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { trader } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(trader?.id);
  const { showToast } = useToast();

  const handleAction = (notif: typeof notifications[0], action: 'accept' | 'reject' | 'view') => {
    markAsRead(notif.id);
    if (action === 'accept') {
      showToast('Trade offer accepted! 🎉', 'success');
    } else if (action === 'reject') {
      showToast('Trade offer declined', 'info');
    } else {
      showToast('Opening details...', 'info');
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-[3px] border-l-[#FF3B93]';
      case 'medium': return 'border-l-[3px] border-l-[#FF8CC6]';
      default: return 'border-l-[3px] border-l-transparent';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[60]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] z-[70] shadow-soft-lg flex flex-col"
            style={{ backgroundColor: '#FFF6FA' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#FFD6EC' }}>
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: '#FF3B93' }} />
                <h2 className="text-[15px] font-bold" style={{ color: '#4A1838' }}>Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#FF3B93' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllAsRead(); showToast('All marked as read', 'success'); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors hover:bg-[#FFE3F1]"
                    style={{ color: '#FF3B93' }}
                  >
                    <Check size={12} className="inline mr-1" /> Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full transition-colors hover:bg-[#FFE3F1]"
                  style={{ color: '#4A1838' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[16px] h-24" style={{ backgroundColor: '#FFEAF3' }} />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#FF8CC6' }} />
                  <p className="text-[14px] font-bold mb-1" style={{ color: '#4A1838' }}>No notifications yet</p>
                  <p className="text-[12px]" style={{ color: '#B08AA0' }}>
                    Trade activity and matches will appear here
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const config = typeConfig[notif.type] || typeConfig.system;
                  const Icon = config.icon;
                  const timeAgo = getTimeAgo(notif.created_at);

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded-[16px] p-3 border transition-all hover:shadow-soft cursor-pointer ${getPriorityBorder(notif.priority)} ${
                        !notif.is_read ? 'bg-white' : ''
                      }`}
                      style={{ backgroundColor: notif.is_read ? '#FFF6FA' : '#FFFFFF', borderColor: '#FFD6EC' }}
                      onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                    >
                      {/* Type badge */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon size={12} style={{ color: config.color }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: config.color }}>{config.label}</span>
                        <span className="text-[10px] font-bold ml-auto" style={{ color: '#B08AA0' }}>{timeAgo}</span>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF3B93' }} />
                        )}
                      </div>

                      {/* Title & Body */}
                      <h4 className="text-[12px] font-bold mb-0.5" style={{ color: '#4A1838' }}>{notif.title}</h4>
                      {notif.body && (
                        <p className="text-[11px] mb-2 line-clamp-2" style={{ color: '#7A4A68' }}>{notif.body}</p>
                      )}

                      {/* Action buttons for trade offers */}
                      {notif.type === 'trade_offer' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction(notif, 'accept'); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[11px] font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
                          >
                            <CheckCircle size={12} /> Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction(notif, 'reject'); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[11px] font-bold border"
                            style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}
                          >
                            <X size={12} /> Decline
                          </button>
                        </div>
                      )}

                      {/* View button for match notifications */}
                      {notif.type === 'match_found' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(notif, 'view'); }}
                          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: '#FFF7CC', color: '#8A6A00' }}
                        >
                          <Star size={12} /> View Match
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
