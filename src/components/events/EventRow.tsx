import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Eye, EyeOff, Radio, Pin, PinOff, ExternalLink, Archive, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { TimeStatusBadge } from './TimeStatusBadge';
import { cn } from '@/lib/utils';
import type { EventWithPricing } from '@/hooks/useEvents';

interface EventRowProps {
  event: EventWithPricing;
  isSelected?: boolean;
  onSelect?: (event: EventWithPricing) => void;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onToggleLive?: (id: string, isLive: boolean) => void;
  onTogglePinned?: (id: string, isPinned: boolean) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  index?: number;
}

export function EventRow({
  event,
  isSelected,
  onSelect,
  onToggleSelect,
  onPublish,
  onUnpublish,
  onToggleLive,
  onTogglePinned,
  onArchive,
  onDelete,
  index = 0,
}: EventRowProps) {
  const title = event.override_title || event.api_title || 'Sans titre';
  const imageUrl = event.override_image_url || event.api_image_url;
  const hasOverride = !!(event.override_title || event.override_description || event.override_image_url);

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'dd MMM yyyy HH:mm', { locale: fr })
    : '—';

  const price = event.pricing?.manual_price || event.pricing?.computed_price;
  const formattedPrice = price ? `${Number(price).toFixed(2)} €` : '—';

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        'group border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors',
        isSelected && 'bg-primary/5'
      )}
      onClick={() => onSelect?.(event)}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect?.(event.id, !!checked)}
        />
      </td>

      {/* Event Info */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="w-12 h-8 rounded bg-muted overflow-hidden flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground/30">
                {event.sport?.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Title & Indicators */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate max-w-[200px]">
                {title}
              </span>
              {event.is_live && <LiveBadge showLabel={false} />}
              {event.is_pinned && <PinnedBadge />}
              {hasOverride && <OverrideBadge isOverride />}
            </div>
            {(event.home_team || event.away_team) && (
              <p className="text-xs text-muted-foreground truncate">
                {event.home_team} vs {event.away_team}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Sport */}
      <td className="py-3 px-2">
        <span className="text-sm text-muted-foreground">{event.sport || '—'}</span>
      </td>

      {/* League */}
      <td className="py-3 px-2">
        <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
          {event.league || '—'}
        </span>
      </td>

      {/* Date */}
      <td className="py-3 px-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formattedDate}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={event.status} />
          {event.event_date && (
            <TimeStatusBadge
              eventDate={event.event_date}
              isLive={event.is_live || false}
              showLabel={false}
            />
          )}
        </div>
      </td>

      {/* Tier */}
      <td className="py-3 px-2">
        {event.pricing && (event.pricing.manual_tier || event.pricing.computed_tier) ? (
          <TierBadge
            tier={event.pricing.manual_tier || event.pricing.computed_tier!}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Price */}
      <td className="py-3 px-2">
        <span className="text-sm font-medium">{formattedPrice}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {event.status === 'draft' && onPublish && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => onPublish(event.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}

          {event.status === 'published' && onUnpublish && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => onUnpublish(event.id)}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir sur le site
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
        </div>
      </td>
    </motion.tr>
  );
}
