import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Save, ExternalLink, Calculator, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TierBadge } from '@/components/admin/TierBadge';
import { LiveBadge } from './LiveBadge';
import { cn } from '@/lib/utils';
import type { EventWithPricing } from '@/hooks/useEvents';
import type { EventUpdate } from '@/lib/api-types';

interface EventDetailPanelProps {
  event: EventWithPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (id: string, data: Partial<EventUpdate>) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  isSaving?: boolean;
}

export function EventDetailPanel({
  event,
  open,
  onOpenChange,
  onSave,
  onPublish,
  onUnpublish,
  isSaving,
}: EventDetailPanelProps) {
  const { t } = useTranslation();
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDescription, setOverrideDescription] = useState('');
  const [overrideImageUrl, setOverrideImageUrl] = useState('');

  // Reset form when event changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && event) {
      setOverrideTitle(event.override_title || '');
      setOverrideDescription(event.override_description || '');
      setOverrideImageUrl(event.override_image_url || '');
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!event) return;
    onSave?.(event.id, {
      override_title: overrideTitle || null,
      override_description: overrideDescription || null,
      override_image_url: overrideImageUrl || null,
    });
  };

  const hasChanges =
    event &&
    (overrideTitle !== (event.override_title || '') ||
      overrideDescription !== (event.override_description || '') ||
      overrideImageUrl !== (event.override_image_url || ''));

  if (!event) return null;

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'PPP à HH:mm', { locale: fr })
    : null;

  const price = event.pricing?.manual_price || event.pricing?.computed_price;
  const tier = event.pricing?.manual_tier || event.pricing?.computed_tier;
  const isManualOverride = event.pricing?.is_manual_override;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Détails de l'événement
            </SheetTitle>
            <div className="flex items-center gap-2">
              {event.is_live && <LiveBadge />}
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
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Pays autorisés</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.allowed_countries && event.allowed_countries.length > 0 ? (
                    event.allowed_countries.map((country) => (
                      <Badge key={country} variant="secondary" className="text-xs">
                        {country}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Tous les pays</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pays bloqués</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.blocked_countries && event.blocked_countries.length > 0 ? (
                    event.blocked_countries.map((country) => (
                      <Badge key={country} variant="destructive" className="text-xs">
                        {country}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Aucun</span>
                  )}
                </div>
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
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {tier && <TierBadge tier={tier} />}
                  {isManualOverride && (
                    <Badge variant="outline" className="text-xs">
                      Manuel
                    </Badge>
                  )}
                </div>
                <span className="text-lg font-semibold">
                  {price ? `${Number(price).toFixed(2)} €` : '—'}
                </span>
              </div>
              {event.pricing && (
                <div className="grid grid-cols-2 gap-3 text-sm">
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
              <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Recalculer le prix
              </Button>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 pt-4 pb-2 mt-6 bg-background border-t flex items-center gap-2">
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
            <Save className="h-4 w-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
