import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinnedBadgeProps {
  className?: string;
}

export function PinnedBadge({ className }: PinnedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full',
        'bg-tier-gold/10 text-tier-gold',
        className
      )}
      title="Épinglé"
    >
      <Star className="h-3 w-3 fill-current" />
    </span>
  );
}
