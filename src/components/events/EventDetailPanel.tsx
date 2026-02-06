import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, RefreshCw, Loader2, Archive, Trash2, X, MapPin, DollarSign, FileText, Pencil, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { LiveBadge } from './LiveBadge';
import { TimeStatusBadge } from './TimeStatusBadge';
import { CountryTagsInput } from './CountryTagsInput';
import { cn } from '@/lib/utils';
import { useSuggestPrice } from '@/hooks/usePricingMutations';
import { toast } from 'sonner';
import type { EventWithPricing } from '@/hooks/useEvents';
import type { EventUpdate } from '@/lib/api-types';

interface EventDetailPanelProps {
  event: EventWithPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (id: string, data: Partial<EventUpdate>) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
}

export function EventDetailPanel({
  event,
  open,
  onOpenChange,
  onSave,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete,
  isSaving,
}: EventDetailPanelProps) {
  const { t } = useTranslation();
  const suggestPriceMutation = useSuggestPrice();
  
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDescription, setOverrideDescription] = useState('');
  const [overrideImageUrl, setOverrideImageUrl] = useState('');
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (open && event) {
      setOverrideTitle(event.override_title || '');
      setOverrideDescription(event.override_description || '');
      setOverrideImageUrl(event.override_image_url || '');
      setAllowedCountries(event.allowed_countries || []);
      setBlockedCountries(event.blocked_countries || []);
      setPrice((event as any).price?.toString() || '');
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!event) return;
    const priceValue = price ? parseFloat(price) : null;
    if (priceValue != null && (priceValue < 0.99 || priceValue > 5.0)) {
      toast.error('Le prix doit être entre 0,99 € et 5,00 €');
      return;
    }
    await onSave?.(event.id, {
      override_title: overrideTitle || null,
      override_description: overrideDescription || null,
      override_image_url: overrideImageUrl || null,
      allowed_countries: allowedCountries,
      blocked_countries: blockedCountries,
      price: priceValue,
    } as any);
  };

  const handleSuggestPrice = async () => {
    if (!event) return;
    try {
      const result = await suggestPriceMutation.mutateAsync({
        sport: event.sport,
        league: event.league,
        home_team: event.home_team,
        away_team: event.away_team,
        event_date: event.event_date,
      });
      setPrice(result.price.toString());
      toast.success(`Prix suggéré : ${result.price.toFixed(2)} €`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur IA');
    }
  };

  const hasChanges =
    event &&
    (overrideTitle !== (event.override_title || '') ||
      overrideDescription !== (event.override_description || '') ||
      overrideImageUrl !== (event.override_image_url || '') ||
      JSON.stringify(allowedCountries) !== JSON.stringify(event.allowed_countries || []) ||
      JSON.stringify(blockedCountries) !== JSON.stringify(event.blocked_countries || []) ||
      price !== ((event as any).price?.toString() || ''));

  if (!event) return null;

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'PPP à HH:mm', { locale: fr })
    : null;

  const currentPrice = price ? parseFloat(price) : (event as any).price;

  const imageUrl = overrideImageUrl || event.override_image_url || event.api_image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="text-base font-semibold truncate">
              Détails de l'événement
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              {event.is_live && <LiveBadge />}
              {event.event_date && (
                <TimeStatusBadge eventDate={event.event_date} isLive={event.is_live || false} />
              )}
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>

        {/* Body: 2-column layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: Preview */}
          <div className="w-full lg:w-[38%] border-b lg:border-b-0 lg:border-r bg-muted/20 overflow-y-auto p-6 space-y-5">
            {/* Image preview */}
            <div className="rounded-lg overflow-hidden bg-muted aspect-video">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-muted-foreground/20">
                    {event.sport?.slice(0, 3).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail preview */}
            {event.thumbnail_url && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Vignette Matchday</Label>
                <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                  <img src={event.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Event metadata */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">
                {event.override_title || event.api_title || 'Sans titre'}
              </h3>
              {(event.home_team || event.away_team) && (
                <p className="text-sm text-muted-foreground">
                  {event.home_team} vs {event.away_team}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {event.sport && <Badge variant="outline">{event.sport}</Badge>}
                {event.league && <Badge variant="outline">{event.league}</Badge>}
              </div>
              {formattedDate && (
                <p className="text-sm text-muted-foreground">{formattedDate}</p>
              )}
              {event.venue && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue}
                </p>
              )}
            </div>

            {/* Current pricing display */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prix de vente</p>
              <span className="text-xl font-bold tabular-nums">
                {currentPrice ? `${Number(currentPrice).toFixed(2)} €` : '—'}
              </span>
            </div>
          </div>

          {/* Right Column: Tabs */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 flex-shrink-0">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Infos
                  </TabsTrigger>
                  <TabsTrigger value="editorial" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Éditorial
                  </TabsTrigger>
                  <TabsTrigger value="geo" className="gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Géo
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    Prix
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Tab: Info (read-only) */}
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Titre API</Label>
                      <p className="text-sm mt-0.5">{event.api_title || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description API</Label>
                      <p className="text-sm mt-0.5 line-clamp-4">{event.api_description || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Sport</Label>
                        <p className="text-sm mt-0.5">{event.sport || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ligue</Label>
                        <p className="text-sm mt-0.5">{event.league || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Équipe domicile</Label>
                        <p className="text-sm mt-0.5">{event.home_team || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Équipe extérieur</Label>
                        <p className="text-sm mt-0.5">{event.away_team || '—'}</p>
                      </div>
                    </div>
                    {formattedDate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <p className="text-sm mt-0.5">{formattedDate}</p>
                      </div>
                    )}
                    {event.venue && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Lieu</Label>
                        <p className="text-sm mt-0.5">{event.venue}</p>
                      </div>
                    )}
                    {event.round && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Journée</Label>
                        <p className="text-sm mt-0.5">{event.round}</p>
                      </div>
                    )}
                    {event.api_image_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Image API</Label>
                        <img
                          src={event.api_image_url}
                          alt="API preview"
                          className="w-full h-40 object-cover rounded mt-1"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Editorial */}
                <TabsContent value="editorial" className="mt-0 space-y-5">
                  <div>
                    <Label htmlFor="override-title">Titre personnalisé</Label>
                    <Input
                      id="override-title"
                      value={overrideTitle}
                      onChange={(e) => setOverrideTitle(e.target.value)}
                      placeholder={event.api_title || 'Entrez un titre...'}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="override-description">Description personnalisée</Label>
                    <Textarea
                      id="override-description"
                      value={overrideDescription}
                      onChange={(e) => setOverrideDescription(e.target.value)}
                      placeholder="Description personnalisée..."
                      className="mt-1.5 min-h-[120px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="override-image">URL image personnalisée</Label>
                    <Input
                      id="override-image"
                      value={overrideImageUrl}
                      onChange={(e) => setOverrideImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1.5"
                    />
                    {overrideImageUrl && (
                      <img
                        src={overrideImageUrl}
                        alt="Override preview"
                        className="w-full h-40 object-cover rounded mt-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Geo */}
                <TabsContent value="geo" className="mt-0 space-y-5">
                  <div>
                    <Label className="text-sm mb-2 block">Pays autorisés</Label>
                    <CountryTagsInput
                      value={allowedCountries}
                      onChange={setAllowedCountries}
                      placeholder="FR, US, GB..."
                      variant="allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Laissez vide pour autoriser tous les pays
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Pays bloqués</Label>
                    <CountryTagsInput
                      value={blockedCountries}
                      onChange={setBlockedCountries}
                      placeholder="RU, CN..."
                      variant="blocked"
                    />
                  </div>
                </TabsContent>

                {/* Tab: Pricing - Simplified */}
                <TabsContent value="pricing" className="mt-0 space-y-5">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                    <div>
                      <Label htmlFor="event-price" className="text-sm font-medium">Prix de vente (€)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Définissez le prix unitaire de l'événement (entre 0,99 € et 5,00 €)
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-[200px]">
                          <Input
                            id="event-price"
                            type="number"
                            step="0.01"
                            min="0.99"
                            max="5.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="2.99"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            €
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={handleSuggestPrice}
                          disabled={suggestPriceMutation.isPending}
                        >
                          {suggestPriceMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Suggérer par IA
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Min : 0,99 € — Max : 5,00 €
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            {event.status !== 'archived' && onArchive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive(event.id)}
                className="gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                Archiver
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(event.id)}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {event.status === 'draft' && onPublish && (
              <Button size="sm" onClick={() => onPublish(event.id)}>
                Publier
              </Button>
            )}
            {event.status === 'published' && onUnpublish && (
              <Button variant="outline" size="sm" onClick={() => onUnpublish(event.id)}>
                Dépublier
              </Button>
            )}
            <Button
              size="sm"
              variant={hasChanges ? 'default' : 'secondary'}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
