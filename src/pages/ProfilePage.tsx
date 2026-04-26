import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Edit3, LogOut, Heart, RefreshCw, Star, Award,
  TrendingUp, Package, Sparkles, CheckCircle, Target, Moon, UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useProfileStats } from '../hooks/useProfileStats';
import { supabase } from '../lib/supabase';
import AvatarUpload from '../components/AvatarUpload';

const rankTitles = ['Strawberry Syrup','Strawberry Cookie','Strawberry Macaron','Strawberry Milk','Strawberry Parfait','Strawberry Cake'];

export default function ProfilePage() {
  const { trader, isLoggedIn, logout, refreshTrader, updateTraderField } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { inventory, wishlist, metrics, loading: statsLoading } = useProfileStats(trader?.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '', bio: '', buddyName: '',
    birthdayMonth: '', birthdayDay: '',
    identityLabel: '', pronounsLabel: '',
    showZodiac: true, showIdentity: true, showPronouns: true,
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'wishlist' | 'identity'>('overview');

  useEffect(() => { if (!isLoggedIn) { navigate('/login'); return; } }, [isLoggedIn, navigate]);
  useEffect(() => { if (trader) setEditForm({
    displayName: trader.display_name, bio: trader.bio || '', buddyName: trader.buddy_name || '',
    birthdayMonth: trader.birthday_month?.toString() || '',
    birthdayDay: trader.birthday_day?.toString() || '',
    identityLabel: trader.identity_label || '',
    pronounsLabel: trader.pronouns_label || '',
    showZodiac: trader.show_zodiac ?? true,
    showIdentity: trader.show_identity_charm ?? true,
    showPronouns: trader.show_pronouns_charm ?? true,
  }); }, [trader]);

  const handleSave = async () => {
    if (!trader) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('traders').update({
      display_name: editForm.displayName,
      bio: editForm.bio,
      buddy_name: editForm.buddyName || null,
      birthday_month: editForm.birthdayMonth ? parseInt(editForm.birthdayMonth) : null,
      birthday_day: editForm.birthdayDay ? parseInt(editForm.birthdayDay) : null,
      identity_label: editForm.identityLabel || null,
      pronouns_label: editForm.pronounsLabel || null,
      show_zodiac: editForm.showZodiac,
      show_identity_charm: editForm.showIdentity,
      show_pronouns_charm: editForm.showPronouns,
    }).eq('id', trader.id);
    if (error) showToast('Failed to update', 'error');
    else { showToast('Profile updated! 🎀', 'success'); refreshTrader(); setIsEditing(false); }
  };

  const handleLogout = async () => { await logout(); showToast('See you soon! 👋', 'success'); navigate('/'); };
  if (!trader) return null;

  const rankTitle = rankTitles[Math.min(trader.strawberry_rank, 5)] || 'Strawberry Syrup';

  const rarityColorMap: Record<string, string> = {
    SSR: '#FF3B93',
    SR: '#8A6A00',
    R: '#2FAF7F',
    N: '#7A4A68',
  };

  const renderOverview = () => (
    <>
      {/* Conversion Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] p-5 border shadow-soft mb-4"
        style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: '#FF8CC6' }} />
          <h3 className="text-h2 text-[14px]">Conversion Tracking</h3>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[16px] h-20" style={{ backgroundColor: '#FFEAF3' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Wishlist Fulfillment */}
            <div className="rounded-[16px] p-3" style={{ backgroundColor: '#FFEAF3' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={12} style={{ color: '#FF3B93' }} />
                <span className="text-[11px] font-bold" style={{ color: '#7A4A68' }}>Wishlist Fulfilled</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-[22px] font-extrabold" style={{ color: '#FF3B93' }}>{metrics.wishlistFulfillmentRate}%</span>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#FFD6EC' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${metrics.wishlistFulfillmentRate}%`, background: 'linear-gradient(90deg, #FF8CC6, #FF3B93)' }} />
              </div>
            </div>

            {/* Trade Acceptance Rate */}
            <div className="rounded-[16px] p-3" style={{ backgroundColor: '#E7FFF4' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle size={12} style={{ color: '#2FAF7F' }} />
                <span className="text-[11px] font-bold" style={{ color: '#7A4A68' }}>Trade Success</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-[22px] font-extrabold" style={{ color: '#2FAF7F' }}>{metrics.tradeAcceptanceRate}%</span>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#C8F5DC' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${metrics.tradeAcceptanceRate}%`, background: 'linear-gradient(90deg, #9EE6C4, #2FAF7F)' }} />
              </div>
            </div>

            {/* Offers Stats */}
            <div className="rounded-[16px] p-3" style={{ backgroundColor: '#F0E4FF' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw size={12} style={{ color: '#7B5EAA' }} />
                <span className="text-[11px] font-bold" style={{ color: '#7A4A68' }}>Offer Activity</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: '#4A1838' }}>{metrics.totalOffersSent}</p>
                  <p className="text-[9px] font-bold" style={{ color: '#B08AA0' }}>Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: '#4A1838' }}>{metrics.totalOffersReceived}</p>
                  <p className="text-[9px] font-bold" style={{ color: '#B08AA0' }}>Received</p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: '#2FAF7F' }}>{metrics.acceptedOffers}</p>
                  <p className="text-[9px] font-bold" style={{ color: '#B08AA0' }}>Accepted</p>
                </div>
              </div>
            </div>

            {/* Collection Completion */}
            <div className="rounded-[16px] p-3" style={{ backgroundColor: '#FFF7CC' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} style={{ color: '#8A6A00' }} />
                <span className="text-[11px] font-bold" style={{ color: '#7A4A68' }}>Collections</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-[22px] font-extrabold" style={{ color: '#8A6A00' }}>{metrics.collectionCompletionRate}%</span>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#FFE8A0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${metrics.collectionCompletionRate}%`, background: 'linear-gradient(90deg, #FFE8A0, #8A6A00)' }} />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#FFEAF3' }}>
          <RefreshCw size={14} className="mx-auto mb-1" style={{ color: '#FF8CC6' }} />
          <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{metrics.acceptedOffers}</p>
          <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Trades</p>
        </div>
        <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#E7FFF4' }}>
          <Package size={14} className="mx-auto mb-1" style={{ color: '#2FAF7F' }} />
          <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{inventory.length}</p>
          <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Inventory</p>
        </div>
        <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#F0E4FF' }}>
          <Heart size={14} className="mx-auto mb-1" style={{ color: '#7B5EAA' }} />
          <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{wishlist.length}</p>
          <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Wishlist</p>
        </div>
        <div className="rounded-[16px] p-2.5 text-center" style={{ backgroundColor: '#FFF7CC' }}>
          <Award size={14} className="mx-auto mb-1" style={{ color: '#8A6A00' }} />
          <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{trader.strawberry_rank}</p>
          <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>Rank</p>
        </div>
      </div>
    </>
  );

  const renderInventory = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {statsLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[16px] h-16" style={{ backgroundColor: '#FFEAF3' }} />
          ))}
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-8 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <Package size={24} className="mx-auto mb-2 opacity-30" style={{ color: '#FF8CC6' }} />
          <p className="text-body" style={{ color: '#B08AA0' }}>No items in your inventory yet.</p>
          <p className="text-caption mt-1" style={{ color: '#FF3B93' }}>Add items you own to start trading!</p>
        </div>
      ) : (
        inventory.map((inv) => (
          <div
            key={inv.inventoryId}
            className="flex items-center gap-3 p-3 rounded-[16px] border"
            style={{ backgroundColor: '#FFF6FA', borderColor: inv.isTradeable ? '#9EE6C4' : '#FFD6EC' }}
          >
            <div
              className="w-12 h-12 rounded-[12px] flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: inv.isTradeable ? '#E7FFF4' : '#FFEAF3' }}
            >
              {inv.item.image_url ? (
                <img src={inv.item.image_url} alt="" className="w-full h-full object-cover rounded-[12px]" />
              ) : (
                '🎁'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate" style={{ color: '#4A1838' }}>{inv.item.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: inv.item.rarity === 'SSR' ? '#FFE3F1' : inv.item.rarity === 'SR' ? '#FFF7CC' : inv.item.rarity === 'R' ? '#E7FFF4' : '#FFEAF3',
                    color: rarityColorMap[inv.item.rarity || 'N'] || '#7A4A68',
                  }}
                >
                  {inv.item.rarity || inv.item.tier || 'N'}
                </span>
                <span className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>x{inv.quantityOwned}</span>
              </div>
            </div>
            {inv.isTradeable && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#E7FFF4', color: '#2FAF7F' }}>
                Tradable
              </span>
            )}
          </div>
        ))
      )}
    </motion.div>
  );

  const renderWishlist = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {statsLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[16px] h-16" style={{ backgroundColor: '#FFEAF3' }} />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-8 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <Heart size={24} className="mx-auto mb-2 opacity-30" style={{ color: '#FF8CC6' }} />
          <p className="text-body" style={{ color: '#B08AA0' }}>Your wishlist is empty.</p>
          <p className="text-caption mt-1" style={{ color: '#FF3B93' }}>Browse collections to add items!</p>
        </div>
      ) : (
        wishlist.map((entry) => {
          const isOwned = inventory.some((inv) => inv.item.id === entry.item.id);
          return (
            <div
              key={entry.entryId}
              className="flex items-center gap-3 p-3 rounded-[16px] border"
              style={{
                backgroundColor: '#FFF6FA',
                borderColor: isOwned ? '#9EE6C4' : '#FFD6EC',
                opacity: isOwned ? 0.6 : 1,
              }}
            >
              <div
                className="w-12 h-12 rounded-[12px] flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: isOwned ? '#E7FFF4' : '#FFEAF3' }}
              >
                {entry.item.image_url ? (
                  <img src={entry.item.image_url} alt="" className="w-full h-full object-cover rounded-[12px]" />
                ) : (
                  '💝'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate" style={{ color: '#4A1838' }}>{entry.item.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: entry.item.rarity === 'SSR' ? '#FFE3F1' : entry.item.rarity === 'SR' ? '#FFF7CC' : entry.item.rarity === 'R' ? '#E7FFF4' : '#FFEAF3',
                      color: rarityColorMap[entry.item.rarity || 'N'] || '#7A4A68',
                    }}
                  >
                    {entry.item.rarity || entry.item.tier || 'N'}
                  </span>
                  {entry.priority === 'high' && <span className="text-[9px] font-bold" style={{ color: '#FF3B93' }}>🔥 High</span>}
                </div>
              </div>
              {isOwned ? (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: '#E7FFF4', color: '#2FAF7F' }}>
                  <CheckCircle size={10} /> Owned
                </span>
              ) : (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
                  {entry.priority}
                </span>
              )}
            </div>
          );
        })
      )}
    </motion.div>
  );

  const renderIdentity = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Zodiac Card */}
      <div className="rounded-[16px] p-4 border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
        <div className="flex items-center gap-2 mb-3">
          <Moon size={14} style={{ color: '#7B5EAA' }} />
          <h4 className="text-[13px] font-bold" style={{ color: '#4A1838' }}>Zodiac Sign</h4>
          {trader.show_zodiac && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ backgroundColor: '#E7FFF4', color: '#2FAF7F' }}>Visible</span>
          )}
        </div>
        {trader.zodiac_sign || (trader.birthday_month && trader.birthday_day) ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: '#F0E4FF' }}>
              {trader.zodiac_sign === 'Aries' && '♈'}
              {trader.zodiac_sign === 'Taurus' && '♉'}
              {trader.zodiac_sign === 'Gemini' && '♊'}
              {trader.zodiac_sign === 'Cancer' && '♋'}
              {trader.zodiac_sign === 'Leo' && '♌'}
              {trader.zodiac_sign === 'Virgo' && '♍'}
              {trader.zodiac_sign === 'Libra' && '♎'}
              {trader.zodiac_sign === 'Scorpio' && '♏'}
              {trader.zodiac_sign === 'Sagittarius' && '♐'}
              {trader.zodiac_sign === 'Capricorn' && '♑'}
              {trader.zodiac_sign === 'Aquarius' && '♒'}
              {trader.zodiac_sign === 'Pisces' && '♓'}
              {!trader.zodiac_sign && '✨'}
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: '#4A1838' }}>{trader.zodiac_sign || 'Unknown'}</p>
              {trader.birthday_month && trader.birthday_day && (
                <p className="text-[11px]" style={{ color: '#B08AA0' }}>
                  {new Date(2000, trader.birthday_month - 1, trader.birthday_day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: '#B08AA0' }}>Add your birthday to display your zodiac sign.</p>
        )}
      </div>

      {/* Identity Charm */}
      {trader.identity_label && trader.show_identity_charm && (
        <div className="rounded-[16px] p-4 border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <div className="flex items-center gap-2 mb-2">
            <UserCircle size={14} style={{ color: '#FF3B93' }} />
            <h4 className="text-[13px] font-bold" style={{ color: '#4A1838' }}>Identity</h4>
          </div>
          <span className="inline-block text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
            {trader.identity_label}
          </span>
        </div>
      )}

      {/* Pronouns Charm */}
      {trader.pronouns_label && trader.show_pronouns_charm && (
        <div className="rounded-[16px] p-4 border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} style={{ color: '#FF8CC6' }} />
            <h4 className="text-[13px] font-bold" style={{ color: '#4A1838' }}>Pronouns</h4>
          </div>
          <span className="inline-block text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFEAF3', color: '#7B5EAA' }}>
            {trader.pronouns_label}
          </span>
        </div>
      )}

      {!trader.identity_label && !trader.pronouns_label && !trader.zodiac_sign && !(trader.birthday_month && trader.birthday_day) && (
        <div className="text-center py-8 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <UserCircle size={24} className="mx-auto mb-2 opacity-30" style={{ color: '#FF8CC6' }} />
          <p className="text-body" style={{ color: '#B08AA0' }}>No identity charms set yet.</p>
          <p className="text-caption mt-1" style={{ color: '#FF3B93' }}>Edit your profile to add zodiac, identity, and pronouns!</p>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-5">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Profile Header Card */}
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

              {/* Birthday for Zodiac */}
              <div>
                <label className="text-[12px] font-bold">Birthday (for Zodiac)</label>
                <div className="flex gap-2">
                  <select
                    value={editForm.birthdayMonth}
                    onChange={(e) => setEditForm({ ...editForm, birthdayMonth: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
                    style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editForm.birthdayDay}
                    onChange={(e) => setEditForm({ ...editForm, birthdayDay: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
                    style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Identity */}
              <div>
                <label className="text-[12px] font-bold">Identity Label</label>
                <input
                  type="text"
                  value={editForm.identityLabel}
                  onChange={(e) => setEditForm({ ...editForm, identityLabel: e.target.value })}
                  placeholder="e.g. Girl, Boy, Non-binary"
                  className="w-full px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
                  style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
                />
                <label className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: '#7A4A68' }}>
                  <input
                    type="checkbox"
                    checked={editForm.showIdentity}
                    onChange={(e) => setEditForm({ ...editForm, showIdentity: e.target.checked })}
                    className="rounded"
                  />
                  Show on profile
                </label>
              </div>

              {/* Pronouns */}
              <div>
                <label className="text-[12px] font-bold">Pronouns</label>
                <input
                  type="text"
                  value={editForm.pronounsLabel}
                  onChange={(e) => setEditForm({ ...editForm, pronounsLabel: e.target.value })}
                  placeholder="e.g. She/Her, He/Him, They/Them"
                  className="w-full px-3 py-2 rounded-[16px] text-[13px] border-2 border-transparent focus:outline-none"
                  style={{ backgroundColor: '#FFEAF3', color: '#4A1838' }}
                />
                <label className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: '#7A4A68' }}>
                  <input
                    type="checkbox"
                    checked={editForm.showPronouns}
                    onChange={(e) => setEditForm({ ...editForm, showPronouns: e.target.checked })}
                    className="rounded"
                  />
                  Show on profile
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 h-9 rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>Save</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 h-9 rounded-full text-[12px] font-bold border" style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}>Cancel</button>
              </div>
            </motion.div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-[16px] mb-4" style={{ backgroundColor: '#FFEAF3' }}>
            {[
              { key: 'overview' as const, label: 'Overview', icon: Star },
              { key: 'inventory' as const, label: `Inventory (${inventory.length})`, icon: Package },
              { key: 'wishlist' as const, label: `Wishlist (${wishlist.length})`, icon: Heart },
              { key: 'identity' as const, label: 'Identity', icon: UserCircle },
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

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'wishlist' && renderWishlist()}
          {activeTab === 'identity' && renderIdentity()}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Link to="/trades" className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
              Find Trades
            </Link>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 h-9 rounded-full text-[12px] font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
