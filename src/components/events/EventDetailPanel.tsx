import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, RefreshCw, Loader2, Archive, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TierBadge } from '@/components/admin/TierBadge';
import { LiveBadge } from './LiveBadge';
import { TimeStatusBadge } from './TimeStatusBadge';
import { CountryTagsInput } from './CountryTagsInput';
import type { EventWithPricing } from '@/hooks/useEvents';
import type { EventUpdate, PricingTier, EventPricingUpdate } from '@/lib/api-types';

interface EventDetailPanelProps {
  event: EventWithPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (id: string, data: Partial<EventUpdate>) => void;
  onUpdatePricing?: (eventId: string, data: EventPricingUpdate) => void;
  onRecomputePricing?: (eventId: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  isRecomputing?: boolean;
}

export function EventDetailPanel({
  event,
  open,
  onOpenChange,
  onSave,
  onUpdatePricing,
  onRecomputePricing,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete,
  isSaving,
  isRecomputing,
}: EventDetailPanelProps) {
  const { t } = useTranslation();
  
  // Editorial overrides
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDescription, setOverrideDescription] = useState('');
  const [overrideImageUrl, setOverrideImageUrl] = useState('');
  
  // Geo restrictions
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  
  // Pricing
  const [manualPrice, setManualPrice] = useState('');
  const [manualTier, setManualTier] = useState<PricingTier | ''>('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Reset form when event changes
  useEffect(() => {
    if (open && event) {
      setOverrideTitle(event.override_title || '');
      setOverrideDescription(event.override_description || '');
      setOverrideImageUrl(event.override_image_url || '');
      setAllowedCountries(event.allowed_countries || []);
      setBlockedCountries(event.blocked_countries || []);
      setManualPrice(event.pricing?.manual_price?.toString() || '');
      setManualTier(event.pricing?.manual_tier || '');
      setIsManualOverride(event.pricing?.is_manual_override || false);
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!event) return;
    
    // Save event data
    await onSave?.(event.id, {
      override_title: overrideTitle || null,
      override_description: overrideDescription || null,
      override_image_url: overrideImageUrl || null,
      allowed_countries: allowedCountries,
      blocked_countries: blockedCountries,
    });
    
    // Save pricing if manual override is enabled
    if (onUpdatePricing) {
      await onUpdatePricing(event.id, {
        manual_price: isManualOverride && manualPrice ? parseFloat(manualPrice) : null,
        manual_tier: isManualOverride && manualTier ? manualTier : null,
        is_manual_override: isManualOverride,
      });
    }
  };

  const hasChanges =
    event &&
    (overrideTitle !== (event.override_title || '') ||
      overrideDescription !== (event.override_description || '') ||
      overrideImageUrl !== (event.override_image_url || '') ||
      JSON.stringify(allowedCountries) !== JSON.stringify(event.allowed_countries || []) ||
      JSON.stringify(blockedCountries) !== JSON.stringify(event.blocked_countries || []) ||
      manualPrice !== (event.pricing?.manual_price?.toString() || '') ||
      manualTier !== (event.pricing?.manual_tier || '') ||
      isManualOverride !== (event.pricing?.is_manual_override || false));

  if (!event) return null;

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'PPP à HH:mm', { locale: fr })
    : null;

  const displayPrice = isManualOverride 
    ? (manualPrice || event.pricing?.computed_price)
    : event.pricing?.computed_price;
  const displayTier = isManualOverride 
    ? (manualTier || event.pricing?.computed_tier)
    : event.pricing?.computed_tier;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Détails de l'événement
            </SheetTitle>
            <div className="flex items-center gap-2">
              {event.is_live && <LiveBadge />}
              {event.event_date && (
                <TimeStatusBadge
                  eventDate={event.event_date}
                  isLive={event.is_live || false}
                />
              )}
              <StatusBadge status={event.status} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {event.api_title || 'Sans titre'}
          </p>
        </SheetHeader>

        <div className="space-y-6">
          {/* API Data Section (Read-only) */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              Données API (lecture seule)
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Titre API</Label>
                <p className="text-sm">{event.api_title || '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description API</Label>
                <p className="text-sm line-clamp-3">{event.api_description || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Sport</Label>
                  <p className="text-sm">{event.sport || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ligue</Label>
                  <p className="text-sm">{event.league || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Équipe domicile</Label>
                  <p className="text-sm">{event.home_team || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Équipe extérieur</Label>
                  <p className="text-sm">{event.away_team || '—'}</p>
                </div>
              </div>
              {formattedDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{formattedDate}</p>
                </div>
              )}
              {event.api_image_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">Image API</Label>
                  <img
                    src={event.api_image_url}
                    alt="API preview"
                    className="w-full h-32 object-cover rounded mt-1"
                  />
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Editorial Overrides Section */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Surcharges éditoriales
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="override-title">Titre personnalisé</Label>
                <Input
                  id="override-title"
                  value={overrideTitle}
                  onChange={(e) => setOverrideTitle(e.target.value)}
                  placeholder={event.api_title || 'Entrez un titre...'}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="override-description">Description personnalisée</Label>
                <Textarea
                  id="override-description"
                  value={overrideDescription}
                  onChange={(e) => setOverrideDescription(e.target.value)}
                  placeholder="Description personnalisée..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="override-image">URL image personnalisée</Label>
                <Input
                  id="override-image"
                  value={overrideImageUrl}
                  onChange={(e) => setOverrideImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
                {overrideImageUrl && (
                  <img
                    src={overrideImageUrl}
                    alt="Override preview"
                    className="w-full h-32 object-cover rounded mt-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Geo Restrictions Section */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-info" />
              Restrictions géographiques
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Pays autorisés</Label>
                <CountryTagsInput
                  value={allowedCountries}
                  onChange={setAllowedCountries}
                  placeholder="FR, US, GB..."
                  variant="allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
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
            </div>
          </section>

          <Separator />

          {/* Pricing Section */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tier-gold" />
              Tarification
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              {/* Manual Override Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Surcharge manuelle</Label>
                  <p className="text-xs text-muted-foreground">
                    Définir un prix/tier manuellement
                  </p>
                </div>
                <Switch
                  checked={isManualOverride}
                  onCheckedChange={setIsManualOverride}
                />
              </div>

              {/* Manual Price & Tier Inputs */}
              {isManualOverride && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="manual-price" className="text-xs">Prix manuel (€)</Label>
                    <Input
                      id="manual-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="14.99"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-tier" className="text-xs">Tier manuel</Label>
                    <Select
                      value={manualTier}
                      onValueChange={(value) => setManualTier(value as PricingTier)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Current Pricing Display */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  {displayTier && <TierBadge tier={displayTier} />}
                  {isManualOverride && (
                    <Badge variant="outline" className="text-xs">
                      Manuel
                    </Badge>
                  )}
                </div>
                <span className="text-lg font-semibold">
                  {displayPrice ? `${Number(displayPrice).toFixed(2)} €` : '—'}
                </span>
              </div>

              {/* Computed values display */}
              {event.pricing && (
                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border/50">
                  <div>
                    <Label className="text-xs text-muted-foreground">Prix calculé</Label>
                    <p>
                      {event.pricing.computed_price
                        ? `${Number(event.pricing.computed_price).toFixed(2)} €`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tier calculé</Label>
                    <p>{event.pricing.computed_tier || '—'}</p>
                  </div>
                </div>
              )}

              {/* Recompute Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => onRecomputePricing?.(event.id)}
                disabled={isRecomputing}
              >
                {isRecomputing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Recalculer le prix
              </Button>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 pt-4 pb-2 mt-6 bg-background border-t space-y-2">
          <div className="flex items-center gap-2">
            {event.status === 'draft' && onPublish && (
              <Button
                variant="default"
                onClick={() => onPublish(event.id)}
                className="flex-1"
              >
                Publier
              </Button>
            )}
            {event.status === 'published' && onUnpublish && (
              <Button
                variant="outline"
                onClick={() => onUnpublish(event.id)}
                className="flex-1"
              >
                Dépublier
              </Button>
            )}
            <Button
              variant={hasChanges ? 'default' : 'secondary'}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>

          {/* Archive and Delete Actions */}
          <div className="flex items-center gap-2">
            {event.status !== 'archived' && onArchive && (
              <Button
                variant="outline"
                onClick={() => onArchive(event.id)}
                className="flex-1 gap-2"
              >
                <Archive className="h-4 w-4" />
                Archiver
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={() => onDelete(event.id)}
                className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
