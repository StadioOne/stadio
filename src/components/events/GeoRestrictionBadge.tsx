import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GeoRestrictionBadgeProps {
  allowedCountries?: string[] | null;
  blockedCountries?: string[] | null;
  className?: string;
}

export function GeoRestrictionBadge({
  allowedCountries,
  blockedCountries,
  className,
}: GeoRestrictionBadgeProps) {
  const hasRestrictions =
    (allowedCountries && allowedCountries.length > 0) ||
    (blockedCountries && blockedCountries.length > 0);

  if (!hasRestrictions) return null;

  const allowedCount = allowedCountries?.length || 0;
  const blockedCount = blockedCountries?.length || 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded',
            'bg-info/10 text-info',
            className
          )}
        >
          <Globe className="h-3 w-3" />
          <span>
            {allowedCount > 0 && `+${allowedCount}`}
            {allowedCount > 0 && blockedCount > 0 && '/'}
            {blockedCount > 0 && `-${blockedCount}`}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          {allowedCount > 0 && (
            <p>Autorisés: {allowedCountries?.join(', ')}</p>
          )}
          {blockedCount > 0 && (
            <p>Bloqués: {blockedCountries?.join(', ')}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
