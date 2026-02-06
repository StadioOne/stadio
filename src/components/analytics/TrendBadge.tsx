import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
  value: number;
  className?: string;
  showIcon?: boolean;
}

export function TrendBadge({ value, className, showIcon = true }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-chart-2',
        isNegative && 'text-destructive',
        isNeutral && 'text-muted-foreground',
        className
      )}
    >
      {showIcon && (
        <>
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {isNeutral && <Minus className="h-3 w-3" />}
        </>
      )}
      <span>
        {isPositive && '+'}
        {value.toFixed(1)}%
      </span>
    </span>
  );
}
