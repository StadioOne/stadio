import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TerritoriesBadgeProps {
  territories: string[];
  max?: number;
  className?: string;
}

export function TerritoriesBadge({ territories, max = 3, className }: TerritoriesBadgeProps) {
  if (!territories || territories.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">—</span>
    );
  }

  const displayed = territories.slice(0, max);
  const remaining = territories.length - max;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayed.map((territory) => (
        <Badge
          key={territory}
          variant="secondary"
          className="text-xs px-1.5 py-0"
        >
          {territory}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
