import { CalendarClock, Play, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TimeStatus = 'upcoming' | 'ongoing' | 'finished';

export function getTimeStatus(eventDate: string, isLive: boolean): TimeStatus {
  const now = new Date();
  const date = new Date(eventDate);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  if (isLive) return 'ongoing';
  if (date > now) return 'upcoming';
  if (date > threeHoursAgo) return 'ongoing';
  return 'finished';
}

const TIME_STATUS_CONFIG = {
  upcoming: {
    label: 'À venir',
    icon: CalendarClock,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  ongoing: {
    label: 'En cours',
    icon: Play,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 animate-pulse',
  },
  finished: {
    label: 'Terminé',
    icon: CheckCircle2,
    className: 'bg-muted text-muted-foreground border-border',
  },
} as const;

interface TimeStatusBadgeProps {
  eventDate: string;
  isLive: boolean;
  showLabel?: boolean;
  className?: string;
}

export function TimeStatusBadge({
  eventDate,
  isLive,
  showLabel = true,
  className,
}: TimeStatusBadgeProps) {
  const status = getTimeStatus(eventDate, isLive);
  const config = TIME_STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium text-xs border',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
