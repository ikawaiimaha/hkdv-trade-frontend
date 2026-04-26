import { motion } from 'framer-motion';
import { ArrowRight, Heart, RefreshCw, Zap } from 'lucide-react';
import RarityBadge from './RarityBadge';
import { useToast } from './ToastProvider';

export default function TradeMatchCard({ index = 0 }: { index?: number }) {
  const { showToast } = useToast();
  const score = 72;
  const ringColor = '#FF8CC6';

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
          <RarityBadge tier="epic" />
        </div>
        <span className="text-caption" style={{ color: '#B08AA0' }}>SSR Hunter</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
          🎮
        </div>
        <div>
          <h3 className="text-h2 text-[14px]">KuromiLuvr</h3>
          <p className="text-caption" style={{ color: '#B08AA0' }}>@kuromiluvr</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#FFEAF3" strokeWidth="5" />
            <circle cx="32" cy="32" r="27" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 169.6} 169.6`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[14px] font-extrabold" style={{ color: '#FF3B93' }}>{score}%</span>
            <span className="text-[9px] font-bold" style={{ color: '#B08AA0' }}>Match</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Heart size={12} style={{ color: '#FF8CC6' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>They have items you want</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#FF3B93' }}>6</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={12} style={{ color: '#BFA2FF' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>You have items they want</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#BFA2FF' }}>3</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: '#FFC8A2' }} />
            <span className="text-[11px]" style={{ color: '#7A4A68' }}>Possible trades</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: '#D97A4E' }}>3</span>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] p-3 mb-4" style={{ backgroundColor: '#FFEAF3' }}>
        <p className="text-[11px] font-bold mb-2" style={{ color: '#FF3B93' }}>Strong Trade Match! 💖</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-[12px] p-2 text-center border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>You give</p>
            <p className="text-[11px] font-bold" style={{ color: '#4A1838' }}>Kuromi Chair</p>
            <RarityBadge tier="rare" />
          </div>
          <ArrowRight size={14} style={{ color: '#B08AA0' }} />
          <div className="flex-1 rounded-[12px] p-2 text-center border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>You get</p>
            <p className="text-[11px] font-bold" style={{ color: '#4A1838' }}>Cinna Cloud Bed</p>
            <RarityBadge tier="mythic" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => showToast('Trade offer sent to KuromiLuvr!', 'success')}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full text-[12px] font-bold text-white shadow-soft hover:shadow-soft-hover transition-shadow"
          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
          <Heart size={12} /> Start Trade
        </button>
        <button onClick={() => showToast('Viewing profile soon!', 'info')}
          className="px-4 h-9 rounded-full text-[12px] font-bold border transition-colors hover:bg-[#FFE3F1]"
          style={{ borderColor: '#FFD6EC', color: '#7A4A68' }}>
          View Profile
        </button>
      </div>
    </motion.div>
  );
}
