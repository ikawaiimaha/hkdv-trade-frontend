import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Package, Sparkles, Plus, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import { supabase } from '../lib/supabase';
import type { Item } from '../types/supabase';

interface ItemActionModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
}

export default function ItemActionModal({ item, isOpen, onClose, onActionComplete }: ItemActionModalProps) {
  const { trader, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleAddToWishlist = async () => {
    if (!isLoggedIn || !trader || !item) {
      showToast('Log in to add items to your wishlist! 🔐', 'warning');
      return;
    }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('wishlist_entries')
        .insert({
          trader_id: trader.id,
          item_id: item.id,
          priority: 'medium',
          desired_quantity: quantity,
        });
      if (error) {
        if (error.message?.includes('unique')) {
          showToast('Already in your wishlist! 💝', 'info');
        } else {
          showToast(error.message || 'Failed to add', 'error');
        }
        return;
      }
      showToast(`${item.name} added to wishlist! ✨`, 'success');
      onActionComplete?.();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!isLoggedIn || !trader || !item) {
      showToast('Log in to add items to your inventory! 🔐', 'warning');
      return;
    }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('trader_inventory')
        .insert({
          trader_id: trader.id,
          item_id: item.id,
          quantity_total: quantity,
          quantity_available: quantity > 1 ? quantity - 1 : 0,
          is_tradeable_duplicate: quantity > 1,
        });
      if (error) {
        if (error.message?.includes('unique')) {
          showToast('Already in your inventory! Update quantity from your profile. 📦', 'info');
        } else {
          showToast(error.message || 'Failed to add', 'error');
        }
        return;
      }
      showToast(`${item.name} added to inventory! 📦`, 'success');
      onActionComplete?.();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const rarityColor: Record<string, { bg: string; text: string; border: string }> = {
    SSR: { bg: '#FFE3F1', text: '#FF3B93', border: '#FFD6EC' },
    SR: { bg: '#FFF7CC', text: '#8A6A00', border: '#FFE8A0' },
    R: { bg: '#E7FFF4', text: '#2FAF7F', border: '#C8F5DC' },
    N: { bg: '#FFEAF3', text: '#7A4A68', border: '#FFD6EC' },
  };

  const rc = rarityColor[item.rarity || item.tier || 'N'] || rarityColor.N;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-end"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#4A1838]/30 backdrop-blur-[2px]" />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full rounded-t-[32px] border-t shadow-soft-lg"
            style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#FFD6EC' }} />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-[#FFEAF3]"
              style={{ color: '#B08AA0' }}
            >
              <X size={18} />
            </button>

            <div className="px-6 pb-8 pt-2 max-h-[85vh] overflow-y-auto">
              {/* Momo Header */}
              <div
                className="flex items-center gap-3 p-3 rounded-[20px] mb-5"
                style={{ backgroundColor: '#FFEAF3' }}
              >
                <img
                  src="/momo-happy.png"
                  alt="Momo"
                  className="w-10 h-10 object-contain"
                />
                <p className="text-[13px] font-bold" style={{ color: '#7A4A68' }}>
                  Momo says: "What a cute find! Do you need this one?"
                </p>
              </div>

              {/* Item Preview */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div
                    className="w-[120px] h-[120px] rounded-full mx-auto mb-3 border-4 flex items-center justify-center text-4xl overflow-hidden"
                    style={{
                      backgroundColor: rc.bg,
                      borderColor: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(255,140,198,0.2)',
                    }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      '🎁'
                    )}
                  </div>
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: rc.bg, color: rc.text, borderColor: rc.border }}
                  >
                    {item.rarity || item.tier || 'N'}
                  </span>
                </div>
                <h2 className="text-[18px] font-black mt-2" style={{ color: '#4A1838' }}>
                  {item.name}
                </h2>
                <p className="text-[12px] font-bold mt-0.5" style={{ color: '#B08AA0' }}>
                  {item.character || 'Hello Kitty Dream Village'}
                </p>
                {item.collection_name && (
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: '#FF8CC6' }}>
                    from {item.collection_name}
                  </p>
                )}
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-center gap-4 mb-5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center border"
                  style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
                >
                  <Minus size={14} />
                </button>
                <span className="text-[16px] font-black w-8 text-center" style={{ color: '#4A1838' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center border"
                  style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleAddToWishlist}
                  disabled={loading}
                  className="w-full h-[48px] rounded-full text-[14px] font-bold text-white shadow-soft flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
                >
                  {loading ? (
                    <Sparkles size={16} className="animate-spin" />
                  ) : (
                    <Heart size={16} />
                  )}
                  Add to Wishlist
                </button>

                <button
                  onClick={handleAddToInventory}
                  disabled={loading}
                  className="w-full h-[48px] rounded-full text-[14px] font-bold border flex items-center justify-center gap-2 disabled:opacity-60 transition-colors hover:bg-[#FFEAF3]"
                  style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
                >
                  <Package size={16} />
                  I Already Own This
                </button>

                {!isLoggedIn && (
                  <p className="text-center text-[11px] font-bold mt-1" style={{ color: '#B08AA0' }}>
                    Log in to save items to your collection
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
