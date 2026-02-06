import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Sparkles, Loader2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useUpdateEventPrice, useSuggestPrice } from '@/hooks/usePricingMutations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EventWithPrice } from '@/hooks/usePricing';

interface PricingEventsRowProps {
  event: EventWithPrice;
}

export function PricingEventsRow({ event }: PricingEventsRowProps) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const updatePrice = useUpdateEventPrice();
  const suggestPrice = useSuggestPrice();

  const canEdit = hasRole('admin');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(event.price?.toString() || '');

  const title = event.override_title || event.api_title || `${event.home_team} vs ${event.away_team}`;
  const eventDate = format(new Date(event.event_date), 'dd/MM/yy HH:mm', { locale: fr });

  const formatPrice = (price: number | null) => {
    if (price == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const handleSave = async () => {
    const price = editValue ? parseFloat(editValue) : null;
    if (price != null && (price < 0.99 || price > 5.0)) {
      toast.error('Le prix doit être entre 0,99 € et 5,00 €');
      return;
    }
    await updatePrice.mutateAsync({ eventId: event.id, price });
    setIsEditing(false);
  };

  const handleSuggest = async () => {
    try {
      const result = await suggestPrice.mutateAsync({
        sport: event.sport,
        league: event.league,
        home_team: event.home_team,
        away_team: event.away_team,
        event_date: event.event_date,
      });
      setEditValue(result.price.toString());
      setIsEditing(true);
      toast.success(`Prix suggéré : ${result.price.toFixed(2)} €`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur IA');
    }
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
      <TableCell className="text-right">
        {isEditing ? (
          <div className="flex items-center gap-1 justify-end">
            <Input
              type="number"
              step="0.01"
              min="0.99"
              max="5.00"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-20 h-8 text-right text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <span className="text-xs text-muted-foreground">€</span>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSave} disabled={updatePrice.isPending}>
              ✓
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setIsEditing(false)}>
              ✗
            </Button>
          </div>
        ) : (
          <span className={`font-mono font-semibold ${event.price == null ? 'text-muted-foreground' : ''}`}>
            {formatPrice(event.price)}
          </span>
        )}
      </TableCell>
      <TableCell>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditValue(event.price?.toString() || ''); setIsEditing(true); }}
              title={t('common.edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSuggest}
              disabled={suggestPrice.isPending}
              title="Suggérer par IA"
            >
              {suggestPrice.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
