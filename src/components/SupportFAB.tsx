import { motion } from 'framer-motion';
import { Coffee } from 'lucide-react';

export default function SupportFAB() {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-float animate-glow-pulse hover:shadow-xl transition-shadow border border-white/20"
      style={{ background: 'linear-gradient(135deg, #F04E7C 0%, #FB88A3 50%, #C084FC 100%)' }}
    >
      <Coffee size={16} />
      <span>Support</span>
    </motion.button>
  );
}
