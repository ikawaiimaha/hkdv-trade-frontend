import { Trophy } from 'lucide-react';

type RarityTier = 'common' | 'rare' | 'epic' | 'mythic' | 'social';

interface RarityBadgeProps {
  tier: RarityTier;
  size?: 'sm' | 'md';
}

const rarityConfig: Record<RarityTier, { label: string; bg: string; text: string }> = {
  common:  { label: 'Common',  bg: '#FFE3F1', text: '#FF3B93' },
  rare:    { label: 'Rare',    bg: '#E7FFF4', text: '#2FAF7F' },
  epic:    { label: 'Epic',    bg: '#FFF7CC', text: '#8A6A00' },
  mythic:  { label: 'Mythic',  bg: '#FFE8DE', text: '#D97A4E' },
  social:  { label: 'Social',  bg: '#F0E4FF', text: '#7B5EAA' },
};

export default function RarityBadge({ tier }: RarityBadgeProps) {
  const c = rarityConfig[tier];
  return (
    <span className="chip" style={{ backgroundColor: c.bg, color: c.text }}>
      <Trophy size={10} />
      {c.label}
    </span>
  );
}

export { rarityConfig };
export type { RarityTier };
