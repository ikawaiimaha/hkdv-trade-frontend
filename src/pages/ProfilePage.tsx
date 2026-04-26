import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, LogOut, Heart, RefreshCw, Star, Award, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabase';

interface ProfileStats {
  completedTrades: number;
  activeListings: number;
  wishlistItems: number;
  reputationScore: number;
}

const buddyEmojis: Record<string, string> = {
  'Hello Kitty': '🎀',
  'My Melody': '🐰',
  'Little Twin Stars (Kiki & Lala)': '⭐',
  'Tuxedosam': '🐧',
  'Cinnamoroll': '🐶',
  'Pompompurin': '🍮',
  'Pochacco': '🐕',
  'Kuromi': '😈',
  'Gudetama': '🥚',
  'Badtz-Maru': '🐧',
  'Wish me mell': '🐰',
  'Cogimyun': '🍄',
  'Kerokerokeroppi': '🐸',
  'Hangyodon': '🐟',
  'Ahiru No Pekkle': '🐤',
};

const strawberryRanks = [
  'Strawberry Syrup',
  'Strawberry Cookie',
  'Strawberry Macaron',
  'Strawberry Milk',
  'Strawberry Parfait',
  'Strawberry Cake',
];

export default function ProfilePage() {
  const { trader, isLoggedIn, logout, refreshTrader } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats>({
    completedTrades: 0,
    activeListings: 0,
    wishlistItems: 0,
    reputationScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    buddyName: '',
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadStats();
  }, [isLoggedIn]);

  useEffect(() => {
    if (trader) {
      setEditForm({
        displayName: trader.display_name,
        bio: trader.bio || '',
        buddyName: trader.buddy_name || '',
      });
    }
  }, [trader]);

  async function loadStats() {
    if (!trader) return;
    setLoading(true);

    const [listingsRes, wishlistRes, reputationRes] = await Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('trader_id', trader.id).eq('status', 'active'),
      supabase.from('wishlist_entries').select('*', { count: 'exact', head: true }).eq('trader_id', trader.id),
      supabase.from('reputation_snapshots').select('*').eq('trader_id', trader.id).single(),
    ]);

    setStats({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedTrades: (reputationRes.data as any)?.completed_trades_count || 0,
      activeListings: listingsRes.count || 0,
      wishlistItems: wishlistRes.count || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reputationScore: (reputationRes.data as any)?.reputation_score || 0,
    });
    setLoading(false);
  }

  const handleSave = async () => {
    if (!trader) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('traders')
      .update({
        display_name: editForm.displayName,
        bio: editForm.bio,
        buddy_name: editForm.buddyName || null,
      })
      .eq('id', trader.id);

    if (error) {
      showToast('Failed to update profile', 'error');
    } else {
      showToast('Profile updated! 🎀', 'success');
      await refreshTrader();
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logged out. See you soon! 👋', 'success');
    navigate('/');
  };

  if (!trader) return null;

  const rankTitle = strawberryRanks[Math.min(trader.strawberry_rank, strawberryRanks.length - 1)] || 'Strawberry Syrup';
  const nextRank = trader.strawberry_rank < 5 ? strawberryRanks[trader.strawberry_rank + 1] : null;
  const progress = ((trader.strawberry_rank % 1) || 0) * 100;

  return (
    <div className="pt-14 pb-20">
      <div className="max-w-content mx-auto px-4 mt-6">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-hkdv-pink text-sm font-semibold mb-6 hover:opacity-80 transition-opacity">
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-card-md border border-pink-100/50 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-3xl shadow-md">
                {trader.avatar_url ? (
                  <img src={trader.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <span>{trader.buddy_name ? buddyEmojis[trader.buddy_name] || '🎀' : '🎀'}</span>
                )}
              </div>

              <div>
                <h1 className="text-xl font-extrabold text-hkdv-text">{trader.display_name}</h1>
                <p className="text-sm text-hkdv-text-muted">@{trader.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-hkdv-pink/10 text-hkdv-pink text-xs font-bold">
                    🍓 {rankTitle}
                  </span>
                  {trader.buddy_name && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">
                      {buddyEmojis[trader.buddy_name] || '🎀'} {trader.buddy_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl bg-hkdv-pink/10 text-hkdv-pink hover:bg-hkdv-pink/20 transition-colors"
            >
              <Edit3 size={18} />
            </button>
          </div>

          {/* Bio */}
          {trader.bio && !isEditing && (
            <p className="text-sm text-hkdv-text-secondary mb-4">{trader.bio}</p>
          )}

          {/* Edit Form */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 mb-4"
            >
              <div>
                <label className="text-sm font-semibold text-hkdv-text">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-hkdv-body border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-hkdv-text">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-hkdv-body border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-hkdv-text">Buddy</label>
                <select
                  value={editForm.buddyName}
                  onChange={(e) => setEditForm({ ...editForm, buddyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-hkdv-body border-2 border-transparent focus:border-hkdv-pink/30 focus:outline-none text-sm"
                >
                  <option value="">Select buddy</option>
                  {Object.keys(buddyEmojis).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-2 rounded-xl font-bold text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-xl border-2 border-hkdv-pink/20 text-hkdv-text font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Rank Progress */}
          {nextRank && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-hkdv-text-muted mb-1">
                <span>Progress to {nextRank}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark rounded-full transition-all"
                  style={{ width: `${Math.max(progress, 10)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-4 gap-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-pink-50 rounded-xl p-3 h-16" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-pink-50 rounded-xl p-3 text-center">
                <RefreshCw size={16} className="text-hkdv-pink mx-auto mb-1" />
                <p className="text-lg font-bold text-hkdv-text">{stats.completedTrades}</p>
                <p className="text-[10px] text-hkdv-text-muted">Trades</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Star size={16} className="text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-hkdv-text">{stats.activeListings}</p>
                <p className="text-[10px] text-hkdv-text-muted">Listings</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <Heart size={16} className="text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-hkdv-text">{stats.wishlistItems}</p>
                <p className="text-[10px] text-hkdv-text-muted">Wishlist</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <Award size={16} className="text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-hkdv-text">{stats.reputationScore}</p>
                <p className="text-[10px] text-hkdv-text-muted">Reputation</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Link
              to="/"
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-2.5 rounded-xl font-bold text-sm shadow-float"
            >
              <Sparkles size={14} />
              Browse Items
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </motion.div>

        {/* Coming soon sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-pink-100/30">
            <h3 className="font-bold text-hkdv-text mb-2">My Inventory</h3>
            <p className="text-sm text-hkdv-text-muted">Items you own and want to trade.</p>
            <p className="text-xs text-hkdv-pink mt-2 font-medium">Coming soon!</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-card border border-pink-100/30">
            <h3 className="font-bold text-hkdv-text mb-2">My Wishlist</h3>
            <p className="text-sm text-hkdv-text-muted">Items you&apos;re hunting for.</p>
            <p className="text-xs text-hkdv-pink mt-2 font-medium">Coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
