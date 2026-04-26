import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, Star } from 'lucide-react';
import { useToast } from './ToastProvider';
import type { TradeMatch } from '../hooks/useTradeMatches';

interface DailyOpportunitiesProps {
  matches?: TradeMatch[];
  loading?: boolean;
}

export default function DailyOpportunities({ matches = [], loading = false }: DailyOpportunitiesProps) {
  const { showToast } = useToast();

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] p-5 border shadow-soft"
        style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} style={{ color: '#FF8CC6' }} />
          <h3 className="text-h2 text-[14px]">Today&apos;s Opportunities</h3>
        </div>
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-[16px]" style={{ backgroundColor: '#FFEAF3' }} />
          ))}
        </div>
      </motion.div>
    );
  }

  // Build opportunity list from real matches + fallback messages
  const opportunities = matches.length > 0
    ? matches.slice(0, 3).map((match, i) => {
        const types = ['match', 'wishlist', 'new'] as const;
        const type = types[i % 3];
        const titles = ['Best Trade Match', 'Wishlist Match', 'New Trade Opportunity'];
        return {
          type,
          title: titles[i % 3],
          subtitle: `${match.matchScore}% with @${match.trader.username}`,
          detail: `${match.possibleTrades} possible trades`,
          icon: i === 0 ? '🤝' : i === 1 ? '⭐' : '💫',
          color: i === 0 ? 'bg-[#FFEAF3] border-[#FFD6EC]' : i === 1 ? 'bg-[#E7FFF4] border-[#C8F5DC]' : 'bg-[#F0E4FF] border-[#E8D5FF]',
          score: match.matchScore,
        };
      })
    : [
        {
          type: 'match' as const,
          title: 'Add Your Inventory',
          subtitle: 'Upload items you own to find matches',
          detail: 'Go to your profile to add inventory',
          icon: '📦',
          color: 'bg-[#FFEAF3] border-[#FFD6EC]',
          score: 0,
        },
        {
          type: 'wishlist' as const,
          title: 'Build Your Wishlist',
          subtitle: 'Add items you want to trade for',
          detail: 'Visit collections to add items',
          icon: '💝',
          color: 'bg-[#E7FFF4] border-[#C8F5DC]',
          score: 0,
        },
      ];

  const visibleOpportunities = opportunities.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[24px] p-5 border shadow-soft"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={14} style={{ color: '#FF8CC6' }} />
          <h3 className="text-h2 text-[14px]">Today&apos;s Opportunities</h3>
        </div>
        {matches.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#B08AA0' }}>
            <Clock size={10} /> {matches.length} active
          </div>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {visibleOpportunities.map((opp, i) => (
            <motion.div
              key={`${opp.title}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              onClick={() => showToast(`${opp.title} — ${opp.subtitle}`, 'info')}
              className={`flex items-center gap-3 p-3 rounded-[16px] border cursor-pointer hover:shadow-soft transition-shadow ${opp.color}`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: '#FFF6FA' }}>
                {opp.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[12px] font-bold" style={{ color: '#4A1838' }}>{opp.title}</h4>
                  {opp.score > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>
                      {opp.score}%
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: '#7A4A68' }}>{opp.subtitle}</p>
                <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>{opp.detail}</p>
              </div>
              <ArrowRight size={12} style={{ color: '#B08AA0' }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {matches.length > 0 && (
        <button
          onClick={() => showToast('All opportunities coming soon!', 'info')}
          className="w-full mt-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
          style={{ color: '#FF3B93' }}
        >
          View All <ArrowRight size={10} />
        </button>
      )}
    </motion.div>
  );
}
