import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Bot, User } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { TierBadge } from '@/components/admin/TierBadge';
import { Badge } from '@/components/ui/badge';
import type { PricingHistoryEntry } from '@/hooks/usePricing';

interface PricingHistoryRowProps {
  entry: PricingHistoryEntry;
}

export function PricingHistoryRow({ entry }: PricingHistoryRowProps) {
  const formatPrice = (price: number | null) => {
    if (price == null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formattedDate = format(new Date(entry.created_at), 'dd/MM/yy HH:mm', { locale: fr });

  const getChangeTypeBadge = (changeType: string | null) => {
    switch (changeType) {
      case 'initial':
        return (
          <Badge variant="secondary" className="text-xs">
            Initial
          </Badge>
        );
      case 'automatic':
        return (
          <Badge variant="outline" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            Auto
          </Badge>
        );
      case 'manual':
        return (
          <Badge variant="default" className="text-xs bg-warning/10 text-warning border-warning/20">
            <User className="h-3 w-3 mr-1" />
            Manuel
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {changeType || '-'}
          </Badge>
        );
    }
  };

  const actorDisplay = entry.actor_name || entry.actor_email || 'Système';

  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {formattedDate}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]" title={entry.event_title || '-'}>
            {entry.event_title || '-'}
          </span>
          {entry.event_sport && (
            <span className="text-xs text-muted-foreground">
              {entry.event_sport} {entry.event_league && `• ${entry.event_league}`}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          {entry.previous_tier ? (
            <TierBadge tier={entry.previous_tier} showIcon={false} />
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {formatPrice(entry.previous_price)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          {entry.new_tier ? (
            <TierBadge tier={entry.new_tier} showIcon={false} />
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
          <span className="text-xs font-mono font-semibold">
            {formatPrice(entry.new_price)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {getChangeTypeBadge(entry.change_type)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]" title={actorDisplay}>
        {actorDisplay}
      </TableCell>
    </TableRow>
  );
}
