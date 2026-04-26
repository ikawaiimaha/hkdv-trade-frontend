import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Heart, Sparkles, CheckCircle, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import { useTradeMatches } from '../hooks/useTradeMatches';
import { supabase } from '../lib/supabase';

const ONBOARDING_KEY = 'momo_onboarding_complete';

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { trader } = useAuth();
  const { showToast } = useToast();
  const { matches } = useTradeMatches(trader?.id);
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; rarity: string; character: string | null }>>([]);
  const [selectedInventory, setSelectedInventory] = useState<Set<string>>(new Set());
  const [selectedWishlist, setSelectedWishlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch items for inventory/wishlist selection
  useEffect(() => {
    if (!isOpen || step < 1 || step > 2) return;
    async function fetchItems() {
      const { data } = await supabase.from('items').select('id, name, rarity, character').limit(50);
      setItems((data || []) as typeof items);
    }
    fetchItems();
  }, [isOpen, step]);

  const filteredItems = searchQuery
    ? items.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const toggleInventory = (itemId: string) => {
    setSelectedInventory((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleWishlist = (itemId: string) => {
    setSelectedWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const saveInventory = async () => {
    if (!trader || selectedInventory.size === 0) { setStep(2); return; }
    setLoading(true);
    const inserts = [...selectedInventory].map((itemId) => ({
      trader_id: trader.id,
      item_id: itemId,
      quantity_owned: 1,
      quantity_available: 1,
      is_tradeable_duplicate: true,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('trader_inventory').insert(inserts);
    setLoading(false);
    setStep(2);
    showToast(`${selectedInventory.size} items added to inventory!`, 'success');
  };

  const saveWishlist = async () => {
    if (!trader || selectedWishlist.size === 0) { setStep(3); return; }
    setLoading(true);
    const inserts = [...selectedWishlist].map((itemId) => ({
      trader_id: trader.id,
      item_id: itemId,
      priority: 'medium',
      desired_quantity: 1,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('wishlist_entries').insert(inserts);
    setLoading(false);
    setStep(3);
    showToast(`${selectedWishlist.size} items added to wishlist!`, 'success');
  };

  const handleFinish = () => {
    markOnboardingComplete();
    onClose();
    showToast('Welcome to MomoMint! 🎀 Start trading!', 'success');
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onClose();
  };

  const rarityColor: Record<string, string> = {
    SSR: '#FF3B93',
    SR: '#8A6A00',
    R: '#2FAF7F',
    N: '#7A4A68',
  };

  const rarityBg: Record<string, string> = {
    SSR: '#FFE3F1',
    SR: '#FFF7CC',
    R: '#E7FFF4',
    N: '#FFEAF3',
  };

  const steps = [
    // Step 0: Welcome
    {
      title: 'Welcome to MomoMint!',
      subtitle: 'Let\'s get you set up for trading.',
      content: (
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            🐱
          </motion.div>
          <p className="text-[14px] font-bold mb-2" style={{ color: '#4A1838' }}>
            I&apos;m Momo, your trading assistant!
          </p>
          <p className="text-[13px]" style={{ color: '#7A4A68' }}>
            I&apos;ll help you find the best trades for your Hello Kitty Dream Village collection.
            Let&apos;s set up your inventory and wishlist in just a few steps!
          </p>
        </div>
      ),
      action: { label: 'Get Started', icon: ArrowRight, onClick: () => setStep(1) },
    },
    // Step 1: Inventory
    {
      title: 'What do you have?',
      subtitle: 'Add items you own and want to trade.',
      content: (
        <div className="py-2">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B08AA0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-3 py-2 rounded-[16px] text-[12px] border-2 border-transparent focus:outline-none"
              style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleInventory(item.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-[12px] border transition-all text-left ${
                  selectedInventory.has(item.id) ? 'ring-2 ring-[#9EE6C4] border-[#9EE6C4]' : 'border-[#FFD6EC] hover:bg-[#FFEAF3]'
                }`}
                style={{ backgroundColor: selectedInventory.has(item.id) ? '#E7FFF4' : '#FFF6FA' }}
              >
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: rarityBg[item.rarity || 'N'] || '#FFEAF3' }}>
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: '#4A1838' }}>{item.name}</p>
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                    style={{ backgroundColor: rarityBg[item.rarity || 'N'], color: rarityColor[item.rarity || 'N'] }}
                  >
                    {item.rarity || 'N'}
                  </span>
                </div>
                {selectedInventory.has(item.id) && <CheckCircle size={16} style={{ color: '#2FAF7F' }} />}
              </button>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-center text-[12px] py-4" style={{ color: '#B08AA0' }}>No items found</p>
            )}
          </div>
          <p className="text-[11px] font-bold mt-2" style={{ color: '#FF3B93' }}>
            {selectedInventory.size} items selected
          </p>
        </div>
      ),
      action: { label: 'Continue', icon: ArrowRight, onClick: saveInventory },
      back: () => setStep(0),
    },
    // Step 2: Wishlist
    {
      title: 'What do you want?',
      subtitle: 'Add items you\'re looking for.',
      content: (
        <div className="py-2">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B08AA0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-3 py-2 rounded-[16px] text-[12px] border-2 border-transparent focus:outline-none"
              style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleWishlist(item.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-[12px] border transition-all text-left ${
                  selectedWishlist.has(item.id) ? 'ring-2 ring-[#FF8CC6] border-[#FF8CC6]' : 'border-[#FFD6EC] hover:bg-[#FFEAF3]'
                }`}
                style={{ backgroundColor: selectedWishlist.has(item.id) ? '#FFE3F1' : '#FFF6FA' }}
              >
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: rarityBg[item.rarity || 'N'] || '#FFEAF3' }}>
                  💝
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: '#4A1838' }}>{item.name}</p>
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                    style={{ backgroundColor: rarityBg[item.rarity || 'N'], color: rarityColor[item.rarity || 'N'] }}
                  >
                    {item.rarity || 'N'}
                  </span>
                </div>
                {selectedWishlist.has(item.id) && <Heart size={16} style={{ color: '#FF3B93' }} />}
              </button>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-center text-[12px] py-4" style={{ color: '#B08AA0' }}>No items found</p>
            )}
          </div>
          <p className="text-[11px] font-bold mt-2" style={{ color: '#FF3B93' }}>
            {selectedWishlist.size} items selected
          </p>
        </div>
      ),
      action: { label: 'Continue', icon: ArrowRight, onClick: saveWishlist },
      back: () => setStep(1),
    },
    // Step 3: First Match
    {
      title: 'Your First Match!',
      subtitle: 'Momo found potential trades for you.',
      content: (
        <div className="text-center py-4">
          {matches.length > 0 ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl"
                style={{ backgroundColor: '#E7FFF4' }}
              >
                🤝
              </motion.div>
              <p className="text-[14px] font-bold mb-1" style={{ color: '#4A1838' }}>
                {matches[0].trader.display_name || matches[0].trader.username}
              </p>
              <p className="text-[24px] font-extrabold mb-1" style={{ color: '#FF3B93' }}>
                {matches[0].matchScore}% Match
              </p>
              <div className="flex justify-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: '#FF3B93' }}>{matches[0].theyHaveYouWant.length}</p>
                  <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>They have</p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: '#BFA2FF' }}>{matches[0].youHaveTheyWant.length}</p>
                  <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>You have</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl"
                style={{ backgroundColor: '#FFF7CC' }}
              >
                ⭐
              </motion.div>
              <p className="text-[14px] font-bold mb-2" style={{ color: '#4A1838' }}>
                You&apos;re all set!
              </p>
              <p className="text-[12px]" style={{ color: '#7A4A68' }}>
                As more collectors join, Momo will find your perfect trade matches.
                Check back soon!
              </p>
            </>
          )}
        </div>
      ),
      action: { label: 'Start Trading!', icon: Sparkles, onClick: handleFinish },
      back: () => setStep(2),
    },
  ];

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full max-w-[420px] rounded-[28px] p-6 border shadow-soft-lg"
            style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: '#4A1838' }}>{currentStep.title}</h2>
                <p className="text-[12px]" style={{ color: '#B08AA0' }}>{currentStep.subtitle}</p>
              </div>
              <button onClick={handleSkip} className="p-1.5 rounded-full hover:bg-[#FFEAF3] transition-colors" style={{ color: '#B08AA0' }}>
                <X size={16} />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 mb-4 mt-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 8,
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
            <div className="flex gap-2 mt-4">
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
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-[12px] font-bold text-white shadow-soft disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
              >
                {loading ? 'Saving...' : currentStep.action.label}
                {!loading && <currentStep.action.icon size={14} />}
              </button>
            </div>

            {/* Skip option on first step */}
            {step === 0 && (
              <button
                onClick={handleSkip}
                className="w-full mt-2 text-[11px] font-bold transition-colors"
                style={{ color: '#B08AA0' }}
              >
                Skip for now
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
