import { motion } from 'framer-motion';
import { ArrowRight, Heart, RefreshCw, Zap } from 'lucide-react';
import RarityBadge from './RarityBadge';

interface TradeMatchCardProps {
  index?: number;
}

export default function TradeMatchCard({ index = 0 }: TradeMatchCardProps) {
  const score = 72;
  const scoreColor = score >= 80 ? 'text-pink-500' : score >= 60 ? 'text-purple-500' : score >= 30 ? 'text-orange-400' : 'text-gray-400';
  const scoreBg = score >= 80 ? 'bg-pink-100' : score >= 60 ? 'bg-purple-100' : score >= 30 ? 'bg-orange-100' : 'bg-gray-100';
  const ringColor = score >= 80 ? '#FB88A3' : score >= 60 ? '#C084FC' : score >= 30 ? '#FF8C42' : '#B8A0A8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl p-5 shadow-card-md border border-pink-100/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/mascot-idle.png" alt="" className="w-8 h-8 object-contain" />
          <RarityBadge tier="epic" />
        </div>
        <span className="text-xs text-hkdv-text-muted font-medium">SSR Hunter</span>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-lg">
          &#x1F3AE;
        </div>
        <div>
          <h3 className="font-bold text-hkdv-text text-sm">KuromiLuvr</h3>
          <p className="text-xs text-hkdv-text-muted">@kuromiluvr</p>
        </div>
      </div>

      {/* Match Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#FEEAF2" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-extrabold ${scoreColor}`}>{score}%</span>
            <span className="text-[9px] text-hkdv-text-muted font-medium">Match</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-pink-400" />
            <span className="text-xs text-hkdv-text-secondary">They have items you want</span>
            <span className="ml-auto text-xs font-bold text-hkdv-pink">6</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-blue-400" />
            <span className="text-xs text-hkdv-text-secondary">You have items they want</span>
            <span className="ml-auto text-xs font-bold text-blue-400">3</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs text-hkdv-text-secondary">Possible trades</span>
            <span className="ml-auto text-xs font-bold text-amber-500">3</span>
          </div>
        </div>
      </div>

      {/* Trade preview */}
      <div className={`rounded-xl p-3 mb-4 ${scoreBg} bg-opacity-40`}>
        <p className={`text-xs font-bold mb-2 ${scoreColor}`}>
          Strong Trade Match! &#x2764;&#xFE0F;
        </p>
        <p className="text-xs text-hkdv-text-secondary mb-3">
          Great potential for a balanced trade.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white rounded-lg p-2 text-center">
            <p className="text-[10px] text-hkdv-text-muted mb-1">You give</p>
            <p className="text-xs font-bold text-hkdv-text">Kuromi Spooky Chair</p>
            <RarityBadge tier="rare" size="sm" />
          </div>
          <ArrowRight size={16} className="text-hkdv-text-muted flex-shrink-0" />
          <div className="flex-1 bg-white rounded-lg p-2 text-center">
            <p className="text-[10px] text-hkdv-text-muted mb-1">You get</p>
            <p className="text-xs font-bold text-hkdv-text">Cinnamoroll Cloud Bed</p>
            <RarityBadge tier="mythic" size="sm" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-hkdv-pink to-hkdv-pink-dark text-white py-2.5 rounded-xl text-sm font-bold shadow-float hover:shadow-lg transition-shadow">
          <Heart size={14} />
          Start Best Trade
        </button>
        <button className="px-4 py-2.5 rounded-xl border-2 border-hkdv-pink/20 text-hkdv-text text-sm font-semibold hover:bg-hkdv-pink/5 transition-colors">
          View Profile
        </button>
      </div>
    </motion.div>
  );
}
