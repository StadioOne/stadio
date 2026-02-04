import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { BroadcasterStatusBadge } from './BroadcasterStatusBadge';
import { TerritoriesBadge } from './TerritoriesBadge';
import type { BroadcasterWithStats } from '@/hooks/useBroadcasters';

interface BroadcasterRowProps {
  broadcaster: BroadcasterWithStats;
  onSelect: (broadcaster: BroadcasterWithStats) => void;
  onEdit: (broadcaster: BroadcasterWithStats) => void;
  onActivate: (broadcaster: BroadcasterWithStats) => void;
  onSuspend: (broadcaster: BroadcasterWithStats) => void;
  onDelete: (broadcaster: BroadcasterWithStats) => void;
}

export function BroadcasterRow({
  broadcaster,
  onSelect,
  onEdit,
  onActivate,
  onSuspend,
  onDelete,
}: BroadcasterRowProps) {
  const initials = broadcaster.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect(broadcaster)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={broadcaster.logo_url || undefined} alt={broadcaster.name} />
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{broadcaster.name}</p>
            {broadcaster.legal_name && (
              <p className="text-sm text-muted-foreground">{broadcaster.legal_name}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <BroadcasterStatusBadge status={broadcaster.status} />
      </TableCell>
      <TableCell className="text-center">
        <span className="font-medium">{broadcaster.activeRightsCount}</span>
      </TableCell>
      <TableCell>
        <TerritoriesBadge territories={broadcaster.territories} />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(broadcaster)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {broadcaster.status !== 'active' && (
              <DropdownMenuItem onClick={() => onActivate(broadcaster)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activer
              </DropdownMenuItem>
            )}
            {broadcaster.status === 'active' && (
              <DropdownMenuItem onClick={() => onSuspend(broadcaster)}>
                <XCircle className="h-4 w-4 mr-2" />
                Suspendre
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(broadcaster)}
              className="text-destructive focus:text-destructive"
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
