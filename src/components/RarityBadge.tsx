import { Trophy } from 'lucide-react';

type RarityTier = 'common' | 'rare' | 'epic' | 'mythic' | 'social';

interface RarityBadgeProps {
  tier: RarityTier;
  size?: 'sm' | 'md';
}

const rarityConfig: Record<RarityTier, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  common: {
    label: 'Common',
    emoji: '',
    bg: 'bg-pink-50',
    text: 'text-pink-500',
    border: 'border-pink-200',
  },
  rare: {
    label: 'Rare',
    emoji: '',
    bg: 'bg-blue-50',
    text: 'text-blue-500',
    border: 'border-blue-200',
  },
  epic: {
    label: 'Epic',
    emoji: '',
    bg: 'bg-purple-50',
    text: 'text-purple-500',
    border: 'border-purple-200',
  },
  mythic: {
    label: 'Mythic',
    emoji: '',
    bg: 'bg-amber-50',
    text: 'text-amber-500',
    border: 'border-amber-200',
  },
  social: {
    label: 'Social',
    emoji: '',
    bg: 'bg-rose-50',
    text: 'text-rose-500',
    border: 'border-rose-200',
  },
};

export default function RarityBadge({ tier, size = 'sm' }: RarityBadgeProps) {
  const config = rarityConfig[tier];
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider border ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      <Trophy size={size === 'sm' ? 10 : 12} />
      {config.label}
    </span>
  );
}

export { rarityConfig };
export type { RarityTier };
