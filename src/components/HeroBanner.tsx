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
      animate={{
        y: [0, yOffset, 0],
        rotate: [-5, 5, -5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
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
    <div className="mx-4 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #F04E7C 0%, #FB88A3 40%, #D4A5E0 100%)' }}>
      {/* Floating charms */}
      <FloatingCharm src="/charm-bow.png" className="w-16 h-16 top-4 left-[8%] opacity-70" delay={0} />
      <FloatingCharm src="/charm-star.png" className="w-14 h-14 top-8 right-[10%] opacity-60" delay={1.2} duration={3.5} />
      <FloatingCharm src="/charm-heart.png" className="w-12 h-12 bottom-12 left-[5%] opacity-50" delay={0.8} duration={4.5} yOffset={-10} />
      <FloatingCharm src="/charm-cloud.png" className="w-16 h-16 bottom-8 right-[8%] opacity-60" delay={1.5} duration={5} yOffset={-12} />
      <FloatingCharm src="/charm-flower.png" className="w-10 h-10 top-16 left-[25%] opacity-40" delay={2} duration={3} yOffset={-8} />

      {/* Top stars */}
      <div className="flex items-center justify-center gap-3 pt-5 pb-2 relative z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <Sparkles
            key={`top-${i}`}
            size={10}
            className="text-white/40 animate-twinkle"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>

      <div className="px-6 sm:px-8 py-6 text-center relative z-10">
        {showMascot && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
            className="mb-2"
          >
            <motion.img
              src="/mascot-idle.png"
              alt="HKDV Mascot"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain drop-shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {icon && !showMascot && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-4xl mb-3"
          >
            {icon}
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-sm"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-white/85 text-sm sm:text-base max-w-md mx-auto mb-5 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {ctaText && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(255,255,255,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 bg-white/95 text-hkdv-pink-dark px-6 py-3 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-all"
          >
            <Sparkles size={16} />
            {ctaText}
          </motion.button>
        )}
      </div>

      {/* Bottom stars */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-5 relative z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <Sparkles
            key={`bottom-${i}`}
            size={10}
            className="text-white/40 animate-twinkle"
            style={{ animationDelay: `${(i + 6) * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
