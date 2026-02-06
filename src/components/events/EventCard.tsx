import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Eye, EyeOff, Radio, Pin, PinOff, Archive, Trash2 } from 'lucide-react';
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
import { TimeStatusBadge } from './TimeStatusBadge';
import { cn } from '@/lib/utils';
import type { EventWithPricing } from '@/hooks/useEvents';

interface EventCardProps {
  event: EventWithPricing;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onToggleLive?: (id: string, isLive: boolean) => void;
  onTogglePinned?: (id: string, isPinned: boolean) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (event: EventWithPricing) => void;
  index?: number;
}

export function EventCard({
  event,
  onPublish,
  onUnpublish,
  onToggleLive,
  onTogglePinned,
  onArchive,
  onDelete,
  onSelect,
  index = 0,
}: EventCardProps) {
  const title = event.override_title || event.api_title || 'Sans titre';
  const imageUrl = event.override_image_url || event.api_image_url;
  const hasOverride = !!(event.override_title || event.override_description || event.override_image_url);

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'dd MMM · HH:mm', { locale: fr })
    : null;

  const subtitle = event.home_team && event.away_team
    ? `${event.home_team} vs ${event.away_team}`
    : event.league || event.sport;

  const price = event.pricing?.manual_price || event.pricing?.computed_price;
  const tier = event.pricing?.manual_tier || event.pricing?.computed_tier;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer card-hover',
          'border-border/50 hover:border-primary/30'
        )}
        onClick={() => onSelect?.(event)}
      >
        {/* Image - taller ratio */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-4xl font-bold text-muted-foreground/15">
                {event.sport?.slice(0, 2).toUpperCase() || '?'}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Top-left: date */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {formattedDate && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-black/50 text-white/90 backdrop-blur-sm">
                {formattedDate}
              </span>
            )}
            {event.event_date && (
              <TimeStatusBadge
                eventDate={event.event_date}
                isLive={event.is_live || false}
                showLabel={false}
              />
            )}
          </div>

          {/* Top-right: status & indicators */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {event.is_live && <LiveBadge />}
            {event.is_pinned && <PinnedBadge />}
            <StatusBadge status={event.status} />
          </div>

          {/* Bottom: title, subtitle, price */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-white/60 text-xs mt-0.5 truncate">{subtitle}</p>
            )}
            {/* Price tag */}
            {price && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                {tier && <TierBadge tier={tier} />}
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-white/20 text-white backdrop-blur-sm tabular-nums">
                  {Number(price).toFixed(2)} €
                </span>
              </div>
            )}
          </div>

          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-white/80 text-xs font-medium">Ouvrir le détail</span>
          </div>
        </div>

        {/* Bottom bar */}
        <CardContent className="p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {event.sport && (
              <span className="text-xs text-muted-foreground truncate">{event.sport}</span>
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

              <DropdownMenuItem onClick={() => onToggleLive?.(event.id, !event.is_live)}>
                <Radio className="h-4 w-4 mr-2" />
                {event.is_live ? 'Arrêter le direct' : 'Démarrer le direct'}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onTogglePinned?.(event.id, !event.is_pinned)}>
                {event.is_pinned ? (
                  <><PinOff className="h-4 w-4 mr-2" />Désépingler</>
                ) : (
                  <><Pin className="h-4 w-4 mr-2" />Épingler</>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {event.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onArchive?.(event.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => onDelete?.(event.id)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </motion.div>
  );
}
