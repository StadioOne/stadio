import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BroadcasterStatus } from '@/hooks/useBroadcasters';

interface BroadcasterStatusBadgeProps {
  status: BroadcasterStatus;
  className?: string;
}

const statusConfig: Record<BroadcasterStatus, { label: string; className: string }> = {
  active: {
    label: 'Actif',
    className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  suspended: {
    label: 'Suspendu',
    className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
  pending: {
    label: 'En attente',
    className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  },
};

export function BroadcasterStatusBadge({ status, className }: BroadcasterStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
