import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RightsRow } from './RightsRow';
import type { RightWithEvent } from '@/hooks/useRightsEvents';

interface RightsTableProps {
  rights: RightWithEvent[] | undefined;
  isLoading: boolean;
  onEdit: (right: RightWithEvent) => void;
  onRevoke: (right: RightWithEvent) => void;
  onDelete: (right: RightWithEvent) => void;
}

export function RightsTable({ rights, isLoading, onEdit, onRevoke, onDelete }: RightsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!rights || rights.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Aucun droit trouvé</p>
        <p className="text-sm text-muted-foreground mt-1">
          Utilisez "Attribution en masse" pour ajouter des droits
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Événement</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Droits</TableHead>
            <TableHead>Territoires</TableHead>
            <TableHead>Exclusivité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rights.map((right) => (
            <RightsRow
              key={right.id}
              right={right}
              onEdit={onEdit}
              onRevoke={onRevoke}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
