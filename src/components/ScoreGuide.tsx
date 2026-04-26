import { motion } from 'framer-motion';
import { Heart, RefreshCw, Zap, Scale } from 'lucide-react';

export default function ScoreGuide() {
  const ranges = [
    { min: 0, max: 10, label: 'No overlap', color: 'bg-gray-200', text: 'text-gray-500', heart: '&#x1F90D;' },
    { min: 10, max: 30, label: 'Weak match', color: 'bg-pink-200', text: 'text-pink-400', heart: '&#x2764;&#xFE0F;' },
    { min: 30, max: 60, label: 'Possible trade', color: 'bg-orange-200', text: 'text-orange-400', heart: '&#x1F9E1;' },
    { min: 60, max: 80, label: 'Strong match', color: 'bg-purple-200', text: 'text-purple-400', heart: '&#x1F49C;' },
    { min: 80, max: 100, label: 'Ideal trade match', color: 'bg-pink-300', text: 'text-pink-600', heart: '&#x2764;&#xFE0F;&#x2764;&#xFE0F;' },
  ];

  const factors = [
    { icon: Heart, label: 'They have\nitems you want', sub: 'Higher is better' },
    { icon: RefreshCw, label: 'You have\nitems they want', sub: 'Higher is better' },
    { icon: Zap, label: 'Mutual items\n(Possible Trades)', sub: 'Most important' },
    { icon: Scale, label: 'Value Balance\nFair trades', sub: 'score higher' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-5 shadow-card-md border border-pink-100/50"
    >
      {/* How it works */}
      <div className="mb-5">
        <h3 className="font-bold text-hkdv-text text-sm mb-3 text-center">How It Works</h3>
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-hkdv-pink/10 flex items-center justify-center mb-1">
                  <factor.icon size={18} className="text-hkdv-pink" />
                </div>
                <span className="text-[9px] text-hkdv-text text-center whitespace-pre-line leading-tight">{factor.label}</span>
                <span className="text-[8px] text-hkdv-text-muted">{factor.sub}</span>
              </div>
              {i < factors.length - 1 && (
                <span className="text-hkdv-text-muted text-lg mx-0.5">+</span>
              )}
            </div>
          ))}
          <span className="text-hkdv-text-muted text-lg mx-0.5">=</span>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center mb-1">
              <span className="text-white text-xs font-bold">72%</span>
            </div>
            <span className="text-[9px] text-hkdv-text text-center">Trade Viability</span>
            <span className="text-[8px] text-hkdv-text-muted">0% - 100%</span>
          </div>
        </div>
      </div>

      {/* Score guide */}
      <div>
        <h3 className="font-bold text-hkdv-text text-xs mb-2 uppercase tracking-wider">Score Guide</h3>
        <div className="flex rounded-xl overflow-hidden">
          {ranges.map((range, i) => (
            <div
              key={i}
              className={`flex-1 ${range.color} py-2 px-1 text-center cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <span className="text-sm">{range.heart}</span>
              <p className={`text-[10px] font-bold mt-0.5 ${range.text}`}>
                {range.min} - {range.max}%
              </p>
              <p className={`text-[9px] ${range.text} opacity-80`}>{range.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
