import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type PeriodOption = '7d' | '30d' | '90d' | 'custom';

interface PeriodSelectorProps {
  selected: PeriodOption;
  onSelect: (period: PeriodOption) => void;
  className?: string;
}

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

export function PeriodSelector({ selected, onSelect, className }: PeriodSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant={selected === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function getPeriodDates(period: PeriodOption): { dateFrom: string; dateTo: string } {
  const dateTo = new Date();
  const dateFrom = new Date();
  
  switch (period) {
    case '7d':
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case '30d':
      dateFrom.setDate(dateFrom.getDate() - 30);
      break;
    case '90d':
      dateFrom.setDate(dateFrom.getDate() - 90);
      break;
    default:
      dateFrom.setDate(dateFrom.getDate() - 30);
  }

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0],
  };
}

export function getPreviousPeriodDates(period: PeriodOption): { dateFrom: string; dateTo: string } {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() - days); // End of previous period = start of current
  
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - days); // Go back same number of days

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0],
  };
}

export type { PeriodOption };
