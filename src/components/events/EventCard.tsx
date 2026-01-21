import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Eye, EyeOff, Radio, Pin, PinOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TierBadge } from '@/components/admin/TierBadge';
import { OverrideBadge } from '@/components/admin/OverrideBadge';
import { LiveBadge } from './LiveBadge';
import { PinnedBadge } from './PinnedBadge';
import { GeoRestrictionBadge } from './GeoRestrictionBadge';
import { cn } from '@/lib/utils';
import type { EventWithPricing } from '@/hooks/useEvents';

interface EventCardProps {
  event: EventWithPricing;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onToggleLive?: (id: string, isLive: boolean) => void;
  onTogglePinned?: (id: string, isPinned: boolean) => void;
  onSelect?: (event: EventWithPricing) => void;
  index?: number;
}

export function EventCard({
  event,
  onPublish,
  onUnpublish,
  onToggleLive,
  onTogglePinned,
  onSelect,
  index = 0,
}: EventCardProps) {
  const title = event.override_title || event.api_title || 'Sans titre';
  const imageUrl = event.override_image_url || event.api_image_url;
  const hasOverride = !!(event.override_title || event.override_description || event.override_image_url);

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'PPP à HH:mm', { locale: fr })
    : null;

  const subtitle = event.home_team && event.away_team
    ? `${event.home_team} vs ${event.away_team}`
    : event.league || event.sport;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer card-hover',
          'border-border/50 hover:border-primary/30'
        )}
        onClick={() => onSelect?.(event)}
      >
        {/* Image */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-4xl font-bold text-muted-foreground/20">
                {event.sport?.slice(0, 2).toUpperCase() || '?'}
              </span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {event.sport && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-black/50 text-white backdrop-blur-sm">
                {event.sport}
              </span>
            )}
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {event.is_live && <LiveBadge />}
            {event.is_pinned && <PinnedBadge />}
            <StatusBadge status={event.status} />
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-0.5">
              {title}
            </h3>
            {subtitle && (
              <p className="text-white/70 text-xs truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {event.pricing && (event.pricing.manual_tier || event.pricing.computed_tier) && (
                <TierBadge
                  tier={event.pricing.manual_tier || event.pricing.computed_tier!}
                />
              )}
              {hasOverride && <OverrideBadge isOverride />}
              <GeoRestrictionBadge
                allowedCountries={event.allowed_countries}
                blockedCountries={event.blocked_countries}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {event.status === 'draft' ? (
                  <DropdownMenuItem onClick={() => onPublish?.(event.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Publier
                  </DropdownMenuItem>
                ) : event.status === 'published' ? (
                  <DropdownMenuItem onClick={() => onUnpublish?.(event.id)}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Dépublier
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onToggleLive?.(event.id, !event.is_live)}
                >
                  <Radio className="h-4 w-4 mr-2" />
                  {event.is_live ? 'Arrêter le direct' : 'Démarrer le direct'}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onTogglePinned?.(event.id, !event.is_pinned)}
                >
                  {event.is_pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" />
                      Désépingler
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" />
                      Épingler
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {formattedDate && (
            <p className="text-xs text-muted-foreground mt-2">{formattedDate}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
