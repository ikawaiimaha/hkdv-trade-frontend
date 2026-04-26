import { motion } from 'framer-motion';
import type { Step } from '../data/steps';
import { useToast } from './ToastProvider';

interface StepCardProps {
  step: Step;
  index: number;
}

export default function StepCard({ step, index }: StepCardProps) {
  const { showToast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={() => showToast(`Step ${step.number}: ${step.title}`, 'info')}
      className="rounded-[24px] p-5 shadow-soft hover:shadow-soft-hover transition-shadow duration-200 border cursor-pointer"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px] shadow-sm"
          style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-h2 mb-1" style={{ color: '#FF3B93' }}>{step.title}</h3>
          <p className="text-body" style={{ color: '#7A4A68' }}>{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
