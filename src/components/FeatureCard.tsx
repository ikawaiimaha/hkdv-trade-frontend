import { motion } from 'framer-motion';
import type { Feature } from '../data/features';
import { useToast } from './ToastProvider';

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const emojis = ['🛍️', '⭐', '🔍', '🎟️'];

export default function FeatureCard({ feature, index }: FeatureCardProps) {
  const { showToast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => showToast(`${feature.title} — coming soon!`, 'info')}
      className="rounded-[24px] p-5 shadow-soft hover:shadow-soft-hover transition-shadow duration-200 border cursor-pointer"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      <div className="text-2xl mb-3">{emojis[index]}</div>
      <h3 className="text-h2 mb-1.5" style={{ color: '#FF3B93' }}>{feature.title}</h3>
      <p className="text-body" style={{ color: '#7A4A68' }}>{feature.description}</p>
    </motion.div>
  );
}
