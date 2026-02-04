import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RightsFilters } from './RightsFilters';
import { RightsTable } from './RightsTable';
import { RightsStatsCards } from './RightsStatsCards';
import { RightsBulkDialog } from './RightsBulkDialog';
import { useRightsEvents, useRightsStats, type RightsExclusivity, type RightsStatus, type RightWithEvent } from '@/hooks/useRightsEvents';
import { useRightsMutations } from '@/hooks/useRightsMutations';

interface RightsTabProps {
  broadcasterId: string;
  broadcasterName: string;
}

export function RightsTab({ broadcasterId, broadcasterName }: RightsTabProps) {
  // Filters
  const [search, setSearch] = useState('');
  const [exclusivity, setExclusivity] = useState<RightsExclusivity | 'all'>('all');
  const [status, setStatus] = useState<RightsStatus | 'all'>('all');

  // Dialogs
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Actions
  const [revokeTarget, setRevokeTarget] = useState<RightWithEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RightWithEvent | null>(null);

  // Data
  const { data: rights, isLoading } = useRightsEvents({
    broadcasterId,
    exclusivity,
    status,
    search: search || undefined,
  });
  const { data: stats } = useRightsStats(broadcasterId);
  const { revokeRight, deleteRight } = useRightsMutations();

  const handleEdit = (right: RightWithEvent) => {
    // TODO: Open edit dialog
    console.log('Edit right:', right);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    await revokeRight.mutateAsync(revokeTarget.id);
    setRevokeTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRight.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <RightsStatsCards stats={stats} isLoading={!stats} />

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <RightsFilters
          search={search}
          onSearchChange={setSearch}
          exclusivity={exclusivity}
          onExclusivityChange={setExclusivity}
          status={status}
          onStatusChange={setStatus}
        />
        <Button size="sm" className="shrink-0" onClick={() => setBulkDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Attribution en masse
        </Button>
      </div>

      {/* Bulk assignment dialog */}
      <RightsBulkDialog
        broadcasterId={broadcasterId}
        broadcasterName={broadcasterName}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
      />

      {/* Table */}
      <RightsTable
        rights={rights}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRevoke={setRevokeTarget}
        onDelete={setDeleteTarget}
      />

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer ce droit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le droit de diffusion pour cet événement sera révoqué. 
              Cette action peut être annulée en réactivant le droit ultérieurement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce droit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement ce droit de diffusion. 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
