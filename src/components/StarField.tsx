import { Sparkles } from 'lucide-react';

interface StarFieldProps {
  count?: number;
  className?: string;
}

export default function StarField({ count = 12, className = '' }: StarFieldProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Sparkles
          key={i}
          size={10}
          className="text-white/60 animate-twinkle"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}
