import { motion } from 'framer-motion';
import { Clock, ArrowRight, Star } from 'lucide-react';
import { useToast } from './ToastProvider';

const opportunities = [
  { type: 'match', title: 'Best Trade Match', subtitle: '72% with @KuromiLuvr', detail: 'They have 6 items you want', icon: '🤝', color: 'bg-[#FFEAF3] border-[#FFD6EC]' },
  { type: 'new', title: 'New Collector Nearby', subtitle: 'MyMelodyFan just joined!', detail: '1.2km away', icon: '👥', color: 'bg-[#F0E4FF] border-[#E8D5FF]' },
  { type: 'wishlist', title: 'Wishlist Match', subtitle: '8 new items from collectors', detail: 'Match your wishlist', icon: '⭐', color: 'bg-[#E7FFF4] border-[#C8F5DC]' },
];

export default function DailyOpportunities({ index = 0 }: { index?: number }) {
  const { showToast } = useToast();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-[24px] p-5 border shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={14} style={{ color: '#FF8CC6' }} />
          <h3 className="text-h2 text-[14px]">Today&apos;s Opportunities</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#B08AA0' }}>
          <Clock size={10} /> 12h 34m
        </div>
      </div>

      <div className="space-y-2">
        {opportunities.map((opp, i) => (
          <motion.div key={opp.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => showToast(`${opp.title} — coming soon!`, 'info')}
            className={`flex items-center gap-3 p-3 rounded-[16px] border cursor-pointer hover:shadow-soft transition-shadow ${opp.color}`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: '#FFF6FA' }}>
              {opp.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[12px] font-bold" style={{ color: '#4A1838' }}>{opp.title}</h4>
              <p className="text-[11px]" style={{ color: '#7A4A68' }}>{opp.subtitle}</p>
              <p className="text-[10px] font-bold" style={{ color: '#B08AA0' }}>{opp.detail}</p>
            </div>
            <ArrowRight size={12} style={{ color: '#B08AA0' }} />
          </motion.div>
        ))}
      </div>

      <button onClick={() => showToast('All opportunities coming soon!', 'info')}
        className="w-full mt-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors" style={{ color: '#FF3B93' }}>
        View All <ArrowRight size={10} />
      </button>
    </motion.div>
  );
}
