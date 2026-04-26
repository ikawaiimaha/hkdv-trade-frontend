import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Award, Sparkles, Shield, Crown, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../hooks/useBadges';

const layerIcons: Record<string, typeof Award> = {
  rank: Crown,
  frame: Shield,
  achievement: Award,
  seasonal: Calendar,
};

const layerColors: Record<string, { bg: string; text: string; border: string }> = {
  rank: { bg: '#FFF7CC', text: '#8A6A00', border: '#FFE8A0' },
  frame: { bg: '#F0E4FF', text: '#7B5EAA', border: '#E8D5FF' },
  achievement: { bg: '#FFEAF3', text: '#FF3B93', border: '#FFD6EC' },
  seasonal: { bg: '#E7FFF4', text: '#2FAF7F', border: '#C8F5DC' },
};

export default function BadgesPage() {
  const { trader, isLoggedIn } = useAuth();
  const { badgeProgress, myBadges, loading } = useBadges(isLoggedIn ? trader : null);
  const [filterLayer, setFilterLayer] = useState<string>('all');

  const filteredBadges = filterLayer === 'all'
    ? badgeProgress
    : badgeProgress.filter((bp) => bp.badge.layer === filterLayer);

  const earnedCount = myBadges.length;
  const totalCount = badgeProgress.length;

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Award size={18} style={{ color: '#FF8CC6' }} />
            <h1 className="text-h1">Badges</h1>
          </div>
          <p className="text-body" style={{ color: '#7A4A68' }}>
            {loading ? 'Loading badges...' : `${earnedCount} of ${totalCount} badges earned`}
          </p>

          {/* Progress bar */}
          {!loading && totalCount > 0 && (
            <div className="mt-3">
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#FFEAF3' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #FF8CC6, #BFA2FF)' }}
                />
              </div>
              <p className="text-[11px] font-bold mt-1" style={{ color: '#B08AA0' }}>
                {Math.round((earnedCount / totalCount) * 100)}% complete
              </p>
            </div>
          )}
        </motion.div>

        {/* Layer filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: 'all', label: 'All Badges', icon: Sparkles },
            { key: 'achievement', label: 'Achievements', icon: Award },
            { key: 'rank', label: 'Ranks', icon: Crown },
            { key: 'frame', label: 'Frames', icon: Shield },
            { key: 'seasonal', label: 'Seasonal', icon: Calendar },
          ].map((layer) => (
            <button
              key={layer.key}
              onClick={() => setFilterLayer(layer.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                filterLayer === layer.key ? 'text-white border-transparent shadow-soft' : 'hover:bg-[#FFE3F1]'
              }`}
              style={
                filterLayer === layer.key
                  ? { background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }
                  : { borderColor: '#FFD6EC', color: '#7A4A68' }
              }
            >
              <layer.icon size={12} /> {layer.label}
            </button>
          ))}
        </motion.div>

        {/* Badge Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[24px] p-4 border animate-pulse" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-2" style={{ backgroundColor: '#FFEAF3' }} />
                <div className="h-3 rounded w-2/3 mx-auto" style={{ backgroundColor: '#FFEAF3' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBadges.map((bp, i) => {
              const colors = layerColors[bp.badge.layer] || layerColors.achievement;
              const Icon = layerIcons[bp.badge.layer] || Award;

              return (
                <motion.div
                  key={bp.badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-[24px] p-4 border text-center transition-all hover:shadow-soft ${
                    bp.isUnlocked ? '' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor: bp.isUnlocked ? '#FFFFFF' : '#FFF6FA',
                    borderColor: bp.isUnlocked ? colors.border : '#FFD6EC',
                  }}
                >
                  {/* Badge Icon */}
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center relative"
                    style={{ backgroundColor: bp.isUnlocked ? colors.bg : '#FFEAF3' }}
                  >
                    {bp.badge.image_url ? (
                      <img src={bp.badge.image_url} alt="" className="w-10 h-10 object-contain" />
                    ) : (
                      <Icon size={24} style={{ color: bp.isUnlocked ? colors.text : '#B08AA0' }} />
                    )}
                    {!bp.isUnlocked && (
                      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-white/60">
                        <Lock size={16} style={{ color: '#B08AA0' }} />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <h3 className="text-[12px] font-bold mb-0.5" style={{ color: bp.isUnlocked ? '#4A1838' : '#B08AA0' }}>
                    {bp.badge.label}
                  </h3>

                  {/* Description */}
                  {bp.badge.description && (
                    <p className="text-[10px] mb-2 line-clamp-2" style={{ color: '#B08AA0' }}>
                      {bp.badge.description}
                    </p>
                  )}

                  {/* Layer tag */}
                  <span
                    className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {bp.badge.layer}
                  </span>

                  {/* Progress bar for locked badges */}
                  {!bp.isUnlocked && bp.progress !== undefined && bp.progress > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#FFEAF3' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${bp.progress}%`, background: 'linear-gradient(90deg, #FF8CC6, #BFA2FF)' }}
                        />
                      </div>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: '#B08AA0' }}>{bp.progress}%</p>
                    </div>
                  )}

                  {/* Equipped indicator */}
                  {bp.isEquipped && (
                    <div className="mt-2 text-[9px] font-bold" style={{ color: '#2FAF7F' }}>
                      ✓ Equipped
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredBadges.length === 0 && (
          <div className="text-center py-12 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <Award size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#FF8CC6' }} />
            <p className="text-body" style={{ color: '#B08AA0' }}>No badges in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
