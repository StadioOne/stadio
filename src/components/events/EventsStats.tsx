import { Calendar, Eye, Radio, FileEdit, Archive, CalendarClock, Play, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EventsStatsProps {
  total: number;
  published: number;
  live: number;
  draft: number;
  archived?: number;
  upcoming?: number;
  ongoing?: number;
  finished?: number;
  isLoading?: boolean;
}

export function EventsStats({
  total,
  published,
  live,
  draft,
  archived = 0,
  upcoming = 0,
  ongoing = 0,
  finished = 0,
  isLoading,
}: EventsStatsProps) {
  const editorialStats = [
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
    {
      label: 'Archivés',
      value: archived,
      icon: Archive,
      className: 'text-muted-foreground',
    },
  ];

  const temporalStats = [
    {
      label: 'À venir',
      value: upcoming,
      icon: CalendarClock,
      className: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'En cours',
      value: ongoing,
      icon: Play,
      className: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Terminés',
      value: finished,
      icon: CheckCircle2,
      className: 'text-muted-foreground',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-6">
          {editorialStats.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6">
          {temporalStats.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Editorial Stats */}
      <div className="flex items-center gap-6">
        {editorialStats.map((stat) => (
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

      {/* Temporal Stats */}
      <div className="flex items-center gap-6">
        {temporalStats.map((stat) => (
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
    </div>
  );
}
