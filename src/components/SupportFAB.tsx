import { motion } from 'framer-motion';
import { Coffee } from 'lucide-react';
import { useToast } from './ToastProvider';

export default function SupportFAB() {
  const { showToast } = useToast();

  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => showToast('Support coming soon!', 'info')}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[12px] font-bold shadow-soft hover:shadow-soft-hover transition-shadow border border-white/20"
      style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
    >
      <Coffee size={14} />
      <span>Support</span>
    </motion.button>
  );
}
