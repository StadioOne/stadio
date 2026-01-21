import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DurationBadgeProps {
  seconds: number | null | undefined;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }

  if (remainingSeconds > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes} min`;
}

export function DurationBadge({ seconds, className }: DurationBadgeProps) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 text-xs font-normal',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      <span>{formatDuration(seconds)}</span>
    </Badge>
  );
}
