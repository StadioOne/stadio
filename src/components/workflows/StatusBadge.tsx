import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStatus } from '@/hooks/useWorkflows';

interface StatusBadgeProps {
  status: WorkflowStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  WorkflowStatus,
  {
    icon: typeof CheckCircle;
    bgClass: string;
    textClass: string;
    animate?: boolean;
  }
> = {
  pending: {
    icon: Clock,
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-800 dark:text-yellow-200',
  },
  running: {
    icon: Loader2,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-200',
    animate: true,
  },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-200',
  },
  failed: {
    icon: XCircle,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-200',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 gap-1.5',
        config.bgClass,
        config.textClass,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      <Icon
        className={cn(
          size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
          config.animate && 'animate-spin'
        )}
      />
      {t(`workflows.statuses.${status}`)}
    </Badge>
  );
}
