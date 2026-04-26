import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, LogOut, Heart, RefreshCw, Star, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabase';
import AvatarUpload from '../components/AvatarUpload';

interface ProfileStats {
  completedTrades: number;
  activeListings: number;
  wishlistItems: number;
  reputationScore: number;
}

const rankTitles = ['Strawberry Syrup','Strawberry Cookie','Strawberry Macaron','Strawberry Milk','Strawberry Parfait','Strawberry Cake'];

export default function ProfilePage() {
  const { trader, isLoggedIn, logout, refreshTrader, updateTraderField } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats>({ completedTrades: 0, activeListings: 0, wishlistItems: 0, reputationScore: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', buddyName: '' });

  useEffect(() => { if (!isLoggedIn) { navigate('/login'); return; } loadStats(); }, [isLoggedIn]);
  useEffect(() => { if (trader) setEditForm({ displayName: trader.display_name, bio: trader.bio || '', buddyName: trader.buddy_name || '' }); }, [trader]);

  async function loadStats() {
    if (!trader) return;
    setLoading(true);
    const [listingsRes, wishlistRes, repRes] = await Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('trader_id', trader.id).eq('status', 'active'),
      supabase.from('wishlist_entries').select('*', { count: 'exact', head: true }).eq('trader_id', trader.id),
      supabase.from('reputation_snapshots').select('*').eq('trader_id', trader.id).single(),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setStats({ completedTrades: (repRes.data as any)?.completed_trades_count || 0, activeListings: listingsRes.count || 0, wishlistItems: wishlistRes.count || 0, reputationScore: (repRes.data as any)?.reputation_score || 0 });
    setLoading(false);
  }

  const handleSave = async () => {
    if (!trader) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('traders').update({ display_name: editForm.displayName, bio: editForm.bio, buddy_name: editForm.buddyName || null }).eq('id', trader.id);
    if (error) showToast('Failed to update', 'error');
    else { showToast('Profile updated! 🎀', 'success'); refreshTrader(); setIsEditing(false); }
  };

  const handleLogout = async () => { await logout(); showToast('See you soon! 👋', 'success'); navigate('/'); };
  if (!trader) return null;

  const rankTitle = rankTitles[Math.min(trader.strawberry_rank, 5)] || 'Strawberry Syrup';

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-5">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] p-5 border shadow-soft mb-4" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <AvatarUpload currentAvatar={trader.avatar_url} onUploadComplete={(url: string) => updateTraderField({ avatar_url: url })} />
              <div>
                <h1 className="text-h1">{trader.display_name}</h1>
                <p className="text-caption" style={{ color: '#B08AA0' }}>@{trader.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="chip" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>🍓 {rankTitle}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-[12px] transition-colors hover:bg-[#FFE3F1]" style={{ color: '#FF3B93' }}>
              <Edit3 size={16} />
            </button>
          </div>

          {trader.bio && !isEditing && <p className="text-body mb-4" style={{ color: '#7A4A68' }}>{trader.bio}</p>}

          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 mb-4">
              <div>
                <label className="text-[12px] font-bold">Display Name</label>
                <input type="text" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div>
                <label className="text-[12px] font-bold">Bio</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={2}
                  className="w-full px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none resize-none" style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 h-9 rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>Save</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 h-9 rounded-full text-[12px] font-bold border" style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}>Cancel</button>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-4 gap-2 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="rounded-[16px] p-3 h-16" style={{ backgroundColor: '#FFEAF3' }} />)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#FFEAF3' }}>
                <RefreshCw size={14} className="mx-auto mb-1" style={{ color: '#FF8CC6' }} />
                <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{stats.completedTrades}</p>
                <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Trades</p>
              </div>
              <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#E7FFF4' }}>
                <Star size={14} className="mx-auto mb-1" style={{ color: '#2FAF7F' }} />
                <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{stats.activeListings}</p>
                <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Listings</p>
              </div>
              <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#F0E4FF' }}>
                <Heart size={14} className="mx-auto mb-1" style={{ color: '#7B5EAA' }} />
                <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{stats.wishlistItems}</p>
                <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Wishlist</p>
              </div>
              <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#FFF7CC' }}>
                <Award size={14} className="mx-auto mb-1" style={{ color: '#8A6A00' }} />
                <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{stats.reputationScore}</p>
                <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Rep</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Link to="/" className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
              Browse Items
            </Link>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 h-9 rounded-full text-[12px] font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-[24px] p-5 border shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <h3 className="text-h2 mb-1">My Inventory</h3>
            <p className="text-body" style={{ color: '#7A4A68' }}>Items you own and want to trade.</p>
            <p className="text-caption mt-2" style={{ color: '#FF3B93' }}>Coming soon!</p>
          </div>
          <div className="rounded-[24px] p-5 border shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <h3 className="text-h2 mb-1">My Wishlist</h3>
            <p className="text-body" style={{ color: '#7A4A68' }}>Items you&apos;re hunting for.</p>
            <p className="text-caption mt-2" style={{ color: '#FF3B93' }}>Coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
