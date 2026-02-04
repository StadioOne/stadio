import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BroadcasterRow } from './BroadcasterRow';
import { BroadcasterEmptyState } from './BroadcasterEmptyState';
import type { BroadcasterWithStats } from '@/hooks/useBroadcasters';

interface BroadcasterTableProps {
  broadcasters: BroadcasterWithStats[] | undefined;
  isLoading: boolean;
  hasFilters: boolean;
  onSelect: (broadcaster: BroadcasterWithStats) => void;
  onEdit: (broadcaster: BroadcasterWithStats) => void;
  onActivate: (broadcaster: BroadcasterWithStats) => void;
  onSuspend: (broadcaster: BroadcasterWithStats) => void;
  onDelete: (broadcaster: BroadcasterWithStats) => void;
  onClearFilters: () => void;
  onCreate: () => void;
}

export function BroadcasterTable({
  broadcasters,
  isLoading,
  hasFilters,
  onSelect,
  onEdit,
  onActivate,
  onSuspend,
  onDelete,
  onClearFilters,
  onCreate,
}: BroadcasterTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Diffuseur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-center">Événements</TableHead>
              <TableHead>Territoires</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableHead>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableHead>
                <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-8 mx-auto" /></TableHead>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-8 w-8" /></TableHead>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!broadcasters || broadcasters.length === 0) {
    return (
      <BroadcasterEmptyState
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        onCreate={onCreate}
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Diffuseur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-center">Événements</TableHead>
            <TableHead>Territoires</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {broadcasters.map((broadcaster) => (
            <BroadcasterRow
              key={broadcaster.id}
              broadcaster={broadcaster}
              onSelect={onSelect}
              onEdit={onEdit}
              onActivate={onActivate}
              onSuspend={onSuspend}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
