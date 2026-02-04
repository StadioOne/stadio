import { FileText, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PackagesStatsCardsProps {
  stats?: {
    total: number;
    active: number;
    draft: number;
    bySport: number;
    byCompetition: number;
    bySeason: number;
  };
  isLoading: boolean;
}

export function PackagesStatsCards({ stats, isLoading }: PackagesStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total',
      value: stats?.total || 0,
      icon: FileText,
      className: 'bg-muted/50',
    },
    {
      label: 'Actifs',
      value: stats?.active || 0,
      icon: CheckCircle2,
      className: 'bg-primary/10 text-primary',
    },
    {
      label: 'Brouillons',
      value: stats?.draft || 0,
      icon: Clock,
      className: 'bg-muted/50',
    },
    {
      label: 'Par sport',
      value: stats?.bySport || 0,
      icon: Trophy,
      className: 'bg-muted/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-3 ${card.className}`}
        >
          <div className="flex items-center gap-2">
            <card.icon className="h-4 w-4 opacity-70" />
            <span className="text-xs font-medium text-muted-foreground">
              {card.label}
            </span>
          </div>
          <p className="mt-1 text-xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
