import { motion } from 'framer-motion';
import { Heart, RefreshCw, Zap, Scale } from 'lucide-react';

export default function ScoreGuide() {
  const ranges = [
    { min: 0, max: 10, label: 'No overlap', color: 'bg-gray-100', text: 'text-gray-400', heart: '🤍' },
    { min: 10, max: 30, label: 'Weak', color: 'bg-[#FFEAF3]', text: 'text-[#FF8CC6]', heart: '💗' },
    { min: 30, max: 60, label: 'Possible', color: 'bg-[#FFF7CC]', text: 'text-[#8A6A00]', heart: '🧡' },
    { min: 60, max: 80, label: 'Strong', color: 'bg-[#F0E4FF]', text: 'text-[#7B5EAA]', heart: '💜' },
    { min: 80, max: 100, label: 'Ideal', color: 'bg-[#FFE3F1]', text: 'text-[#FF3B93]', heart: '💖' },
  ];

  const factors = [
    { icon: Heart, label: 'They have\nitems you want', color: '#FF8CC6' },
    { icon: RefreshCw, label: 'You have\nitems they want', color: '#BFA2FF' },
    { icon: Zap, label: 'Mutual\ntrades', color: '#FFC8A2' },
    { icon: Scale, label: 'Value\nbalance', color: '#9EE6C4' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="rounded-[24px] p-5 border shadow-soft" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
      <div className="mb-4">
        <h3 className="text-h2 text-center mb-3">How It Works</h3>
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-0.5" style={{ backgroundColor: `${f.color}20` }}>
                  <f.icon size={14} style={{ color: f.color }} />
                </div>
                <span className="text-[9px] font-bold text-center whitespace-pre-line leading-tight" style={{ color: '#7A4A68' }}>{f.label}</span>
              </div>
              {i < factors.length - 1 && <span className="text-[10px]" style={{ color: '#B08AA0' }}>+</span>}
            </div>
          ))}
          <span className="text-[10px]" style={{ color: '#B08AA0' }}>=</span>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-0.5" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
              <span className="text-white text-[9px] font-bold">72%</span>
            </div>
            <span className="text-[9px] font-bold" style={{ color: '#7A4A68' }}>Match</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-caption uppercase tracking-wider mb-2" style={{ color: '#B08AA0' }}>Score Guide</h3>
        <div className="flex rounded-[12px] overflow-hidden">
          {ranges.map((r, i) => (
            <div key={i} className={`flex-1 ${r.color} py-2 px-0.5 text-center cursor-pointer hover:opacity-80 transition-opacity`}>
              <span className="text-[12px]">{r.heart}</span>
              <p className={`text-[9px] font-bold mt-0.5 ${r.text}`}>{r.min}-{r.max}%</p>
              <p className={`text-[8px] ${r.text} opacity-70`}>{r.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
