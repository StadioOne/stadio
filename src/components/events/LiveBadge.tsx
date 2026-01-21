import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function LiveBadge({ className, showLabel = true }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full',
        'bg-status-live/10 text-status-live',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-live opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-live" />
      </span>
      {showLabel && <span>LIVE</span>}
    </span>
  );
}
