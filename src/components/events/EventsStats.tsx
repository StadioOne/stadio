import { useTranslation } from 'react-i18next';
import { Calendar, Eye, Radio, FileEdit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EventsStatsProps {
  total: number;
  published: number;
  live: number;
  draft: number;
  isLoading?: boolean;
}

export function EventsStats({
  total,
  published,
  live,
  draft,
  isLoading,
}: EventsStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: 'Total',
      value: total,
      icon: Calendar,
      className: 'text-foreground',
    },
    {
      label: 'Publiés',
      value: published,
      icon: Eye,
      className: 'text-status-published',
    },
    {
      label: 'En direct',
      value: live,
      icon: Radio,
      className: 'text-status-live',
    },
    {
      label: 'Brouillons',
      value: draft,
      icon: FileEdit,
      className: 'text-muted-foreground',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-6">
        {stats.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className={cn('h-4 w-4', stat.className)} />
          <span className="text-sm">
            <span className={cn('font-semibold', stat.className)}>
              {stat.value}
            </span>
            <span className="text-muted-foreground ml-1">{stat.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
