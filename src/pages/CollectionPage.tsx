import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, CheckCircle, Sparkles, TrendingUp, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabase';

interface CollectionItem {
  id: string;
  name: string;
  image_url: string | null;
  rarity: 'SSR' | 'SR' | 'R' | 'N';
  rarityBg?: string;
  character: string | null;
  wishlist_count: number;
  isOwned: boolean;
  isOnWishlist: boolean;
}

interface CollectionData {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  is_limited: boolean;
  released_at: string;
}

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const { trader, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadCollection();
  }, [id, trader?.id]);

  async function loadCollection() {
    if (!id) return;
    setLoading(true);

    // Fetch collection
    const { data: collectionData } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (!collectionData) { setLoading(false); return; }
    setCollection(collectionData as CollectionData);

    // Fetch items in this collection
    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .eq('collection_id', id)
      .order('rarity', { ascending: false })
      .order('name', { ascending: true });

    const allItems = (itemsData || []) as unknown as CollectionItem[];

    // Check ownership if logged in
    if (isLoggedIn && trader) {
      const { data: inventory } = await supabase
        .from('trader_inventory')
        .select('item_id')
        .eq('trader_id', trader.id)
        .gt('quantity_owned', 0);

      const { data: wishlist } = await supabase
        .from('wishlist_entries')
        .select('item_id')
        .eq('trader_id', trader.id);

      const ownedIds = new Set((inventory as unknown as Array<{ item_id: string }>)?.map((i) => i.item_id) || []);
      const wishlistIds = new Set((wishlist as unknown as Array<{ item_id: string }>)?.map((w) => w.item_id) || []);

      const enrichedItems = allItems.map((item) => ({
        ...item,
        isOwned: ownedIds.has(item.id),
        isOnWishlist: wishlistIds.has(item.id),
      }));

      setItems(enrichedItems);
      setCompletion(Math.round((enrichedItems.filter((i) => i.isOwned).length / enrichedItems.length) * 100));
    } else {
      setItems(allItems.map((i) => ({ ...i, isOwned: false, isOnWishlist: false })));
      setCompletion(0);
    }

    setLoading(false);
  }

  const addToWishlist = async (itemId: string) => {
    if (!isLoggedIn || !trader) { showToast('Please log in to use wishlist', 'warning'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('wishlist_entries')
      .insert({ trader_id: trader.id, item_id: itemId, priority: 'want' });

    if (error) showToast('Failed to add to wishlist', 'error');
    else { showToast('Added to wishlist! 💖', 'success'); loadCollection(); }
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

  if (loading) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-[24px] mb-4" style={{ backgroundColor: '#FFEAF3' }} />
          <div className="w-32 h-4 rounded mb-2" style={{ backgroundColor: '#FFEAF3' }} />
          <div className="w-24 h-3 rounded" style={{ backgroundColor: '#FFEAF3' }} />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="pt-[60px] pb-20 text-center px-4">
        <img src="/momo-idle.png" alt="" className="w-16 h-16 mx-auto mb-4 opacity-40" />
        <h1 className="text-h1 mb-2">Collection Not Found</h1>
        <p className="text-body" style={{ color: '#7A4A68' }}>This collection doesn&apos;t exist or has been removed.</p>
        <Link to="/" className="inline-block mt-4 px-6 py-2.5 rounded-full text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const ownedCount = items.filter((i) => i.isOwned).length;
  const totalCount = items.length;
  const missingCount = totalCount - ownedCount;
  const isAlmostComplete = completion >= 80 && completion < 100;
  const isComplete = completion === 100;

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* Collection Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] p-6 border shadow-soft mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)', borderColor: '#FFD6EC' }}>
          {isAlmostComplete && (
            <div className="absolute top-3 right-3 chip bg-[#FFF7CC] text-[#8A6A00]">🔥 Almost Complete!</div>
          )}
          {isComplete && (
            <div className="absolute top-3 right-3 chip bg-[#E7FFF4] text-[#2FAF7F]">✨ Complete!</div>
          )}

          <div className="flex items-center gap-4">
            {collection.image_url ? (
              <img src={collection.image_url} alt={collection.name} className="w-20 h-20 rounded-[24px] object-cover shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-[24px] flex items-center justify-center text-3xl" style={{ backgroundColor: '#FFF6FA' }}>🎀</div>
            )}
            <div>
              <h1 className="text-h1 text-white mb-1">{collection.name}</h1>
              <p className="text-[13px] text-white/80">{collection.description || `${totalCount} collectible items`}</p>
              {collection.is_limited && (
                <span className="chip mt-2 inline-flex" style={{ backgroundColor: '#BFA2FF', color: '#FFF' }}>🎀 Limited</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-[24px] p-5 border shadow-soft mb-5" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-h2 text-[14px]">Collection Progress</h2>
              <p className="text-caption mt-0.5" style={{ color: '#B08AA0' }}>
                {ownedCount} of {totalCount} items collected
              </p>
            </div>
            <div className="text-right">
              <span className="text-[24px] font-extrabold" style={{ color: isComplete ? '#2FAF7F' : '#FF3B93' }}>{completion}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#FFEAF3' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: isComplete
                  ? 'linear-gradient(90deg, #9EE6C4, #2FAF7F)'
                  : isAlmostComplete
                  ? 'linear-gradient(90deg, #FF8CC6, #BFA2FF)'
                  : 'linear-gradient(90deg, #FF8CC6, #FFD6EC)',
              }}
            />
          </div>

          {missingCount > 0 && (
            <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: '#FF3B93' }}>
              <Lock size={14} />
              {missingCount} items remaining
              {isAlmostComplete && <span className="chip bg-[#FFF7CC] text-[#8A6A00]">80% milestone!</span>}
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-[16px]" style={{ backgroundColor: '#E7FFF4' }}>
              <CheckCircle size={16} style={{ color: '#2FAF7F' }} />
              <span className="text-[13px] font-bold" style={{ color: '#2FAF7F' }}>Collection Complete! You earned a badge.</span>
            </div>
          )}
        </motion.div>

        {/* Items Grid */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2">Items</h2>
          <div className="flex items-center gap-2">
            <span className="chip" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
              <Sparkles size={10} /> {items.filter((i) => i.wishlist_count > 10).length} Hot
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-[24px] p-3 border shadow-soft transition-all ${
                item.isOwned ? 'ring-2 ring-[#9EE6C4]' : ''
              }`}
              style={{ backgroundColor: '#FFF6FA', borderColor: item.isOwned ? '#9EE6C4' : '#FFD6EC' }}
            >
              {/* Item image */}
              <div className="h-28 rounded-[20px] overflow-hidden relative mb-2 flex items-center justify-center" style={{ backgroundColor: rarityBg[item.rarity] || '#FFEAF3' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎁</span>
                )}

                {/* Owned badge */}
                {item.isOwned && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#9EE6C4' }}>
                    <CheckCircle size={14} className="text-white" />
                  </div>
                )}

                {/* Rarity chip */}
                <div className="absolute bottom-2 left-2 chip" style={{ backgroundColor: rarityBg[item.rarity] || '#FFEAF3', color: rarityColor[item.rarity] || '#4A1838' }}>
                  {item.rarity}
                </div>

                {/* Heat indicator */}
                {item.wishlist_count > 5 && (
                  <div className="absolute top-2 left-2 chip bg-[#FFF7CC] text-[#8A6A00]">
                    <TrendingUp size={8} /> {item.wishlist_count}
                  </div>
                )}
              </div>

              {/* Item info */}
              <h3 className="text-[12px] font-bold leading-tight mb-1" style={{ color: '#4A1838' }}>{item.name}</h3>
              <p className="text-[10px] font-bold mb-2" style={{ color: '#B08AA0' }}>{item.character || 'Sanrio'}</p>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {!item.isOwned && !item.isOnWishlist && (
                  <button
                    onClick={() => addToWishlist(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-bold border transition-colors hover:bg-[#FFE3F1]"
                    style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}
                  >
                    <Heart size={10} /> Wishlist
                  </button>
                )}
                {item.isOnWishlist && (
                  <span className="flex-1 text-center py-1.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
                    <Heart size={10} className="inline" /> On Wishlist
                  </span>
                )}
                {item.isOwned && (
                  <span className="flex-1 text-center py-1.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#E7FFF4', color: '#2FAF7F' }}>
                    <CheckCircle size={10} className="inline" /> Owned
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-12">
            <img src="/momo-idle.png" alt="" className="w-14 h-14 mx-auto mb-3 opacity-40" />
            <p className="text-body" style={{ color: '#B08AA0' }}>No items in this collection yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
