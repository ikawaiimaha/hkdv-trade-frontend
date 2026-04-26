import { motion } from 'framer-motion';
import { ArrowRight, Heart, RefreshCw, Zap } from 'lucide-react';
import RarityBadge from './RarityBadge';
import { useToast } from './ToastProvider';
import type { TradeMatch } from '../hooks/useTradeMatches';

interface TradeMatchCardProps {
  match?: TradeMatch;
  index?: number;
}

export default function TradeMatchCard({ match, index = 0 }: TradeMatchCardProps) {
  const { showToast } = useToast();

  // If no match data provided, show empty state
  if (!match) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="rounded-[24px] p-5 border shadow-soft"
        style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <img src="/momo-idle.png" alt="" className="w-7 h-7 object-contain" />
          <span className="text-h2 text-[14px]">Trade Matches</span>
        </div>
        <div className="text-center py-6">
          <p className="text-[13px]" style={{ color: '#B08AA0' }}>
            Add items to your inventory and wishlist to discover trade matches
          </p>
        </div>
      </motion.div>
    );
  }

  const { trader, matchScore, theyHaveYouWant, youHaveTheyWant, possibleTrades } = match;
  const score = matchScore;
  const ringColor = score >= 80 ? '#2FAF7F' : score >= 60 ? '#FF8CC6' : '#BFA2FF';

  const topGive = youHaveTheyWant[0];
  const topGet = theyHaveYouWant[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-[24px] p-5 border shadow-soft"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img src="/momo-idle.png" alt="" className="w-7 h-7 object-contain" />
          <RarityBadge tier={score >= 80 ? 'mythic' : score >= 60 ? 'epic' : 'rare'} />
        </div>
        <span className="text-caption" style={{ color: '#B08AA0' }}>
          {trader.strawberry_title || 'Trader'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
        >
          {trader.avatar_url ? (
            <img src={trader.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            '👤'
          )}
        </div>
        <div>
          <h3 className="text-h2 text-[14px]">{trader.display_name || trader.username}</h3>
          <p className="text-caption" style={{ color: '#B08AA0' }}>@{trader.username}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#FFEAF3" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke={ringColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 169.6} 169.6`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[14px] font-extrabold" style={{ color: ringColor }}>{score}%</span>
            <span className="text-[9px] font-bold" style={{ color: '#B08AA0' }}>Match</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Heart size={12} style={{ color: '#FF8CC6' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>They have items you want</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#FF3B93' }}>{theyHaveYouWant.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={12} style={{ color: '#BFA2FF' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>You have items they want</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#BFA2FF' }}>{youHaveTheyWant.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: '#FFC8A2' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>Possible trades</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#D97A4E' }}>{possibleTrades}</span>
          </div>
        </div>
      </div>

      {topGive && topGet && (
        <div className="rounded-[16px] p-3 mb-4" style={{ backgroundColor: '#FFEAF3' }}>
          <p className="text-[11px] font-bold mb-2" style={{ color: '#FF3B93' }}>
            {score >= 80 ? 'Strong Trade Match! 💖' : score >= 60 ? 'Good Trade Match! ✨' : 'Possible Trade Match 🌸'}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[12px] p-2 text-center border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
              <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>You give</p>
              <p className="text-[11px] font-bold truncate" style={{ color: '#4A1838' }}>{topGive.item.name}</p>
              <RarityBadge tier={topGive.rarity === 'SSR' ? 'mythic' : topGive.rarity === 'SR' ? 'epic' : topGive.rarity === 'R' ? 'rare' : 'common'} />
            </div>
            <ArrowRight size={14} style={{ color: '#B08AA0' }} />
            <div className="flex-1 rounded-[12px] p-2 text-center border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
              <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>You get</p>
              <p className="text-[11px] font-bold truncate" style={{ color: '#4A1838' }}>{topGet.item.name}</p>
              <RarityBadge tier={topGet.rarity === 'SSR' ? 'mythic' : topGet.rarity === 'SR' ? 'epic' : topGet.rarity === 'R' ? 'rare' : 'common'} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => showToast(`Trade offer sent to ${trader.display_name || trader.username}!`, 'success')}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold text-white shadow-soft hover:shadow-soft-hover transition-shadow"
          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
        >
          <Heart size={12} /> Start Trade
        </button>
        <button
          onClick={() => showToast('Viewing profile soon!', 'info')}
          className="px-4 h-9 rounded-full text-[12px] font-bold border transition-colors hover:bg-[#FFE3F1]"
          style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}
        >
          View Profile
        </button>
      </div>
    </motion.div>
  );
}
