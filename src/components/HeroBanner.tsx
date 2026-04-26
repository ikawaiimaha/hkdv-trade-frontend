import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface FloatingCharmProps {
  src: string;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
}

export function FloatingCharm({ src, className = '', delay = 0, duration = 4, yOffset = -15 }: FloatingCharmProps) {
  return (
    <motion.img
      src={src}
      alt=""
      className={`absolute pointer-events-none ${className}`}
      animate={{ y: [0, yOffset, 0], rotate: [-5, 5, -5] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

interface HeroBannerProps {
  icon?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  onCtaClick?: () => void;
  showMascot?: boolean;
}

export default function HeroBanner({ icon = '', title, subtitle, ctaText, onCtaClick, showMascot = true }: HeroBannerProps) {
  return (
    <div className="mx-4 rounded-[28px] overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #FF8CC6 0%, #BFA2FF 100%)' }}>
      {/* Floating decorations */}
      <FloatingCharm src="/charm-bow.png" className="w-14 h-14 top-4 left-[8%] opacity-60" delay={0} />
      <FloatingCharm src="/charm-star.png" className="w-12 h-12 top-8 right-[10%] opacity-50" delay={1.2} duration={3.5} />
      <FloatingCharm src="/charm-heart.png" className="w-10 h-10 bottom-10 left-[5%] opacity-40" delay={0.8} duration={4.5} yOffset={-10} />
      <FloatingCharm src="/charm-cloud.png" className="w-14 h-14 bottom-6 right-[8%] opacity-50" delay={1.5} duration={5} yOffset={-12} />

      {/* Top sparkles */}
      <div className="flex items-center justify-center gap-3 pt-5 pb-2 relative z-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <Sparkles key={`top-${i}`} size={8} className="text-white/30 animate-twinkle" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>

      <div className="px-6 py-4 text-center relative z-10">
        {showMascot && (
          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }} className="mb-2">
            <motion.img src="/momo-idle.png" alt="Momo" className="w-20 h-20 mx-auto object-contain drop-shadow-md" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          </motion.div>
        )}

        {icon && !showMascot && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }} className="text-3xl mb-3">{icon}</motion.div>
        )}

        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="text-h1 text-white mb-2 tracking-tight drop-shadow-sm">
          {title}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[13px] text-white/80 max-w-sm mx-auto mb-4 leading-relaxed">
          {subtitle}
        </motion.p>

        {ctaText && (
          <motion.button initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={onCtaClick}
            className="inline-flex items-center gap-2 bg-white/95 px-5 py-2.5 rounded-full font-bold text-[13px] shadow-soft hover:shadow-soft-hover transition-shadow" style={{ color: '#FF3B93' }}>
            <Sparkles size={14} />
            {ctaText}
          </motion.button>
        )}
      </div>

      {/* Bottom sparkles */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-4 relative z-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <Sparkles key={`bottom-${i}`} size={8} className="text-white/30 animate-twinkle" style={{ animationDelay: `${(i + 5) * 200}ms` }} />
        ))}
      </div>
    </div>
  );
}
