import { motion } from 'framer-motion';
import type { Step } from '../data/steps';

interface StepCardProps {
  step: Step;
  index: number;
}

export default function StepCard({ step, index }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-md transition-shadow duration-200 border border-pink-100/30"
    >
      <div className="flex items-start gap-4">
        {/* Step number */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, #F04E7C, #FB88A3)' }}
        >
          {step.number}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-hkdv-pink text-sm mb-1.5">{step.title}</h3>
          <p className="text-sm text-hkdv-text-secondary leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
