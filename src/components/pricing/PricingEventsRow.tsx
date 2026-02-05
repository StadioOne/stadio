import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, RefreshCw } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/admin/TierBadge';
import { OverrideBadge } from '@/components/admin/OverrideBadge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useRecomputeEventPricing } from '@/hooks/usePricingMutations';
import { useAuth } from '@/contexts/AuthContext';
import type { EventWithPricing } from '@/hooks/usePricing';
import type { Database } from '@/integrations/supabase/types';

type PricingTier = Database['public']['Enums']['pricing_tier'];

interface PricingEventsRowProps {
  event: EventWithPricing;
  onEdit: () => void;
}

export function PricingEventsRow({ event, onEdit }: PricingEventsRowProps) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const recompute = useRecomputeEventPricing();

  const canEdit = hasRole('admin');

  const pricing = event.pricing;
  const isOverride = pricing?.is_manual_override || false;
  
  // Determine effective tier and price
  const effectiveTier: PricingTier = isOverride && pricing?.manual_tier
    ? pricing.manual_tier
    : pricing?.computed_tier || 'bronze';
  
  const effectivePrice = isOverride && pricing?.manual_price != null
    ? pricing.manual_price
    : pricing?.computed_price || 0;

  const title = event.override_title || event.api_title || `${event.home_team} vs ${event.away_team}`;
  const eventDate = format(new Date(event.event_date), 'dd/MM/yy HH:mm', { locale: fr });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleRecompute = () => {
    recompute.mutate(event.id);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[250px]" title={title}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{eventDate}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{event.sport}</TableCell>
      <TableCell className="text-muted-foreground">{event.league || '-'}</TableCell>
      <TableCell className="text-center">
        <TierBadge tier={effectiveTier} />
      </TableCell>
      <TableCell className="text-right font-mono font-semibold">
        {formatPrice(effectivePrice)}
      </TableCell>
      <TableCell className="text-center">
        <OverrideBadge isOverride={isOverride} />
      </TableCell>
      <TableCell>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title={t('common.edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecompute}
              disabled={recompute.isPending}
              title={t('pricing.recompute')}
            >
              <RefreshCw className={`h-4 w-4 ${recompute.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
