import { Badge } from '@/components/ui/badge';
import { Radio, RotateCcw, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RightsTypeBadgeProps {
  live: boolean;
  replay: boolean;
  highlights: boolean;
  replayWindowHours?: number | null;
  className?: string;
}

export function RightsTypeBadge({ 
  live, 
  replay, 
  highlights, 
  replayWindowHours,
  className 
}: RightsTypeBadgeProps) {
  const types: { icon: typeof Radio; label: string; active: boolean }[] = [
    { icon: Radio, label: 'Live', active: live },
    { icon: RotateCcw, label: replayWindowHours ? `Replay ${replayWindowHours}h` : 'Replay', active: replay },
    { icon: Film, label: 'Highlights', active: highlights },
  ];

  const activeTypes = types.filter((t) => t.active);

  if (activeTypes.length === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        Aucun droit
      </span>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {activeTypes.map(({ icon: Icon, label }) => (
        <Badge key={label} variant="outline" className="gap-1 text-xs">
          <Icon className="h-3 w-3" />
          {label}
        </Badge>
      ))}
    </div>
  );
}
