import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Play, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RightsStatusBadge } from './RightsStatusBadge';
import { PackageScopeBadge } from './PackageScopeBadge';
import { TerritoriesBadge } from './TerritoriesBadge';
import type { RightsPackage } from '@/hooks/useRightsPackages';

interface PackageRowProps {
  pkg: RightsPackage;
  onEdit: (pkg: RightsPackage) => void;
  onActivate: (pkg: RightsPackage) => void;
  onExpire: (pkg: RightsPackage) => void;
  onDelete: (pkg: RightsPackage) => void;
}

export function PackageRow({ pkg, onEdit, onActivate, onExpire, onDelete }: PackageRowProps) {
  const scopeLabel = pkg.scope_type === 'sport' 
    ? pkg.sport?.name_fr || pkg.sport?.name
    : pkg.league?.name_fr || pkg.league?.name;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(pkg)}>
      <TableCell>
        <div className="flex items-center gap-3">
          {pkg.league?.logo_url && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={pkg.league.logo_url} alt={pkg.league.name} />
              <AvatarFallback>{pkg.league.name[0]}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <p className="font-medium line-clamp-1">{pkg.name}</p>
            {scopeLabel && (
              <p className="text-xs text-muted-foreground">{scopeLabel}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <PackageScopeBadge scope={pkg.scope_type} />
      </TableCell>
      <TableCell className="text-sm">
        <div className="space-y-0.5">
          <p>{format(new Date(pkg.start_at), 'dd MMM yyyy', { locale: fr })}</p>
          <p className="text-muted-foreground">
            → {format(new Date(pkg.end_at), 'dd MMM yyyy', { locale: fr })}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <TerritoriesBadge territories={pkg.territories_default} max={3} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {pkg.rights_count || 0} droits
        </Badge>
      </TableCell>
      <TableCell>
        <RightsStatusBadge status={pkg.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(pkg); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            {pkg.status === 'draft' && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onActivate(pkg); }}
                className="text-primary"
              >
                <Play className="h-4 w-4 mr-2" />
                Activer
              </DropdownMenuItem>
            )}
            {pkg.status === 'active' && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onExpire(pkg); }}
                className="text-muted-foreground"
              >
                <Clock className="h-4 w-4 mr-2" />
                Expirer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(pkg); }}
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
