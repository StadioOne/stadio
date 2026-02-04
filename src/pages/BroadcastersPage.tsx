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
import { BroadcasterStats } from '@/components/broadcasters/BroadcasterStats';
import { BroadcasterFilters } from '@/components/broadcasters/BroadcasterFilters';
import { BroadcasterTable } from '@/components/broadcasters/BroadcasterTable';
import { BroadcasterDetailPanel } from '@/components/broadcasters/BroadcasterDetailPanel';
import { AddBroadcasterDialog } from '@/components/broadcasters/AddBroadcasterDialog';
import { useBroadcasters, type BroadcasterStatus, type BroadcasterWithStats } from '@/hooks/useBroadcasters';
import { useBroadcasterMutations } from '@/hooks/useBroadcasterMutations';

export default function BroadcastersPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BroadcasterStatus | 'all'>('all');
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedBroadcaster, setSelectedBroadcaster] = useState<BroadcasterWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BroadcasterWithStats | null>(null);
  
  // Data
  const { data: broadcasters, isLoading } = useBroadcasters({
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });
  const { updateStatus, deleteBroadcaster } = useBroadcasterMutations();

  const hasFilters = !!search || status !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  const handleActivate = (broadcaster: BroadcasterWithStats) => {
    updateStatus.mutate({ id: broadcaster.id, status: 'active' });
  };

  const handleSuspend = (broadcaster: BroadcasterWithStats) => {
    updateStatus.mutate({ id: broadcaster.id, status: 'suspended' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBroadcaster.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Diffuseurs</h1>
          <p className="text-muted-foreground">
            Gérez les droits de diffusion des événements Stadio
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau diffuseur
        </Button>
      </div>

      {/* Stats */}
      <BroadcasterStats />

      {/* Filters */}
      <BroadcasterFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />

      {/* Table */}
      <BroadcasterTable
        broadcasters={broadcasters}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onSelect={setSelectedBroadcaster}
        onEdit={setSelectedBroadcaster}
        onActivate={handleActivate}
        onSuspend={handleSuspend}
        onDelete={setDeleteTarget}
        onClearFilters={handleClearFilters}
        onCreate={() => setAddDialogOpen(true)}
      />

      {/* Detail Panel */}
      <BroadcasterDetailPanel
        broadcaster={selectedBroadcaster}
        open={!!selectedBroadcaster}
        onClose={() => setSelectedBroadcaster(null)}
      />

      {/* Add Dialog */}
      <AddBroadcasterDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce diffuseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le diffuseur "{deleteTarget?.name}" 
              ainsi que tous ses droits associés. Cette action est irréversible.
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
