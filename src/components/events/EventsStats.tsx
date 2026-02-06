import { Calendar, Eye, Radio, FileEdit, Archive, CalendarClock, Play, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  onClickStat?: (filter: { status?: string; isLive?: boolean; timeStatus?: string }) => void;
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
  onClickStat,
}: EventsStatsProps) {
  const kpiCards = [
    {
      label: 'Total',
      value: total,
      icon: Calendar,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      filter: {},
    },
    {
      label: 'Publiés',
      value: published,
      icon: Eye,
      iconBg: 'bg-status-published/10',
      iconColor: 'text-status-published',
      filter: { status: 'published' },
    },
    {
      label: 'En direct',
      value: live,
      icon: Radio,
      iconBg: 'bg-status-live/10',
      iconColor: 'text-status-live',
      pulse: true,
      filter: { isLive: true },
    },
    {
      label: 'Brouillons',
      value: draft,
      icon: FileEdit,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      filter: { status: 'draft' },
    },
  ];

  const temporalStats = [
    {
      label: 'À venir',
      value: upcoming,
      icon: CalendarClock,
      className: 'text-blue-600 dark:text-blue-400',
      filter: { timeStatus: 'upcoming' },
    },
    {
      label: 'En cours',
      value: ongoing,
      icon: Play,
      className: 'text-green-600 dark:text-green-400',
      filter: { timeStatus: 'ongoing' },
    },
    {
      label: 'Terminés',
      value: finished,
      icon: CheckCircle2,
      className: 'text-muted-foreground',
      filter: { timeStatus: 'finished' },
    },
    {
      label: 'Archivés',
      value: archived,
      icon: Archive,
      className: 'text-muted-foreground',
      filter: { status: 'archived' },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-6">
          {temporalStats.map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn(
                'relative overflow-hidden cursor-pointer card-hover group',
                'border-border/50 hover:border-primary/30'
              )}
              onClick={() => onClickStat?.(card.filter)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                  </div>
                  <div className={cn('rounded-lg p-2.5', card.iconBg, card.pulse && 'animate-pulse')}>
                    <Icon className={cn('h-4 w-4', card.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Temporal Stats - compact row */}
      <div className="flex items-center gap-5 px-1">
        {temporalStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              className="flex items-center gap-1.5 group/stat hover:opacity-80 transition-opacity"
              onClick={() => onClickStat?.(stat.filter)}
            >
              <Icon className={cn('h-3.5 w-3.5', stat.className)} />
              <span className="text-sm">
                <span className={cn('font-semibold tabular-nums', stat.className)}>
                  {stat.value}
                </span>
                <span className="text-muted-foreground ml-1">{stat.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
