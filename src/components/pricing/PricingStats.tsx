import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PricingStats as PricingStatsType } from '@/hooks/usePricing';

interface PricingStatsProps extends Partial<PricingStatsType> {
  isLoading?: boolean;
}

export function PricingStats({
  total = 0,
  withPrice = 0,
  withoutPrice = 0,
  averagePrice = 0,
  isLoading,
}: PricingStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: 'Total',
      value: total,
      icon: DollarSign,
      className: 'text-foreground',
    },
    {
      label: 'Avec prix',
      value: withPrice,
      icon: TrendingUp,
      className: 'text-emerald-500',
    },
    {
      label: 'Sans prix',
      value: withoutPrice,
      icon: AlertCircle,
      className: 'text-warning',
    },
    {
      label: 'Prix moyen',
      value: `${averagePrice.toFixed(2)} €`,
      icon: DollarSign,
      className: 'text-primary',
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
    <div className="flex items-center gap-6 flex-wrap">
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
