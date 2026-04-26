import { motion } from 'framer-motion';
import type { Feature } from '../data/features';

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const emojis = ['🛍️', '⭐', '🔍', '🎟️'];

export default function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-md transition-shadow duration-200 border border-pink-100/30"
    >
      <div className="text-3xl mb-3">{emojis[index]}</div>
      <h3 className="font-bold text-hkdv-pink text-base mb-2">{feature.title}</h3>
      <p className="text-sm text-hkdv-text-secondary leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}
