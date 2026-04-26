import { motion } from 'framer-motion';
import { Clock, ArrowRight, Star } from 'lucide-react';
import { useToast } from './ToastProvider';

interface Opportunity {
  type: 'match' | 'new' | 'wishlist';
  title: string;
  subtitle: string;
  detail: string;
  icon: string;
  color: string;
}

const opportunities: Opportunity[] = [
  {
    type: 'match',
    title: 'Best Trade Match',
    subtitle: '72% with @KuromiLuvr',
    detail: 'They have 6 items you want',
    icon: '&#x1F91D;',
    color: 'bg-pink-50 border-pink-200',
  },
  {
    type: 'new',
    title: 'New Collector Nearby',
    subtitle: 'MyMelodyFan just joined!',
    detail: '1.2km away',
    icon: '&#x1F465;',
    color: 'bg-purple-50 border-purple-200',
  },
  {
    type: 'wishlist',
    title: 'Wishlist Match',
    subtitle: '8 new items from collectors',
    detail: 'match your wishlist',
    icon: '&#x2B50;',
    color: 'bg-blue-50 border-blue-200',
  },
];

export default function DailyOpportunities({ index = 0 }: { index?: number }) {
  const { showToast } = useToast();

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
          <Star size={16} className="text-hkdv-yellow" />
          <h3 className="font-bold text-hkdv-text text-sm">Today&apos;s Opportunities</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-hkdv-text-muted">
          <Clock size={12} />
          <span>Resets in 12h 34m</span>
        </div>
      </div>

      {/* Opportunities list */}
      <div className="space-y-3">
        {opportunities.map((opp, i) => (
          <motion.div
            key={opp.type}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => showToast(`${opp.title} — opening details soon! 🎀`, 'info')}
            className={`flex items-center gap-3 p-3 rounded-xl border ${opp.color} cursor-pointer hover:shadow-sm transition-shadow`}
          >
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg flex-shrink-0">
              <span dangerouslySetInnerHTML={{ __html: opp.icon }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-hkdv-text">{opp.title}</h4>
              <p className="text-[11px] text-hkdv-text-secondary">{opp.subtitle}</p>
              <p className="text-[10px] text-hkdv-text-muted">{opp.detail}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0">
              <ArrowRight size={14} className="text-hkdv-text-muted" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <button
        onClick={() => showToast('All opportunities view coming soon! 🌟', 'info')}
        className="w-full mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-hkdv-pink hover:text-hkdv-pink-dark transition-colors"
      >
        View All Opportunities
        <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}
