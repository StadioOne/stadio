import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Ban, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { RightsStatusBadge } from './RightsStatusBadge';
import { ExclusivityBadge } from './ExclusivityBadge';
import { RightsTypeBadge } from './RightsTypeBadge';
import { TerritoriesBadge } from './TerritoriesBadge';
import type { RightWithEvent } from '@/hooks/useRightsEvents';

interface RightsRowProps {
  right: RightWithEvent;
  onEdit: (right: RightWithEvent) => void;
  onRevoke: (right: RightWithEvent) => void;
  onDelete: (right: RightWithEvent) => void;
}

export function RightsRow({ right, onEdit, onRevoke, onDelete }: RightsRowProps) {
  const eventTitle = right.event.override_title || right.event.api_title || 
    `${right.event.home_team || ''} vs ${right.event.away_team || ''}`;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(right)}>
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium line-clamp-1">{eventTitle}</p>
          <p className="text-xs text-muted-foreground">
            {right.event.league || right.event.sport}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {format(new Date(right.event.event_date), 'dd MMM yyyy HH:mm', { locale: fr })}
      </TableCell>
      <TableCell>
        <RightsTypeBadge
          live={right.rights_live}
          replay={right.rights_replay}
          highlights={right.rights_highlights}
          replayWindowHours={right.replay_window_hours}
        />
      </TableCell>
      <TableCell>
        <TerritoriesBadge territories={right.territories_allowed} max={3} />
      </TableCell>
      <TableCell>
        <ExclusivityBadge exclusivity={right.exclusivity} />
      </TableCell>
      <TableCell>
        <RightsStatusBadge status={right.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(right); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            {right.status === 'active' && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onRevoke(right); }}
                className="text-orange-600 dark:text-orange-400"
              >
                <Ban className="h-4 w-4 mr-2" />
                Révoquer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(right); }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
