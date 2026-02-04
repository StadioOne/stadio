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
import { PackagesFilters } from './PackagesFilters';
import { PackagesTable } from './PackagesTable';
import { PackagesStatsCards } from './PackagesStatsCards';
import { PackageEditDialog } from './PackageEditDialog';
import { useRightsPackages, usePackageStats, type PackageScope, type RightsStatus, type RightsPackage } from '@/hooks/useRightsPackages';
import { useRightsPackageMutations } from '@/hooks/useRightsPackageMutations';

interface PackagesTabProps {
  broadcasterId: string;
  broadcasterName: string;
}

export function PackagesTab({ broadcasterId, broadcasterName }: PackagesTabProps) {
  // Filters
  const [search, setSearch] = useState('');
  const [scopeType, setScopeType] = useState<PackageScope | 'all'>('all');
  const [status, setStatus] = useState<RightsStatus | 'all'>('all');

  // Dialogs
  const [editTarget, setEditTarget] = useState<RightsPackage | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<RightsPackage | null>(null);

  // Data
  const { data: packages, isLoading } = useRightsPackages({
    broadcasterId,
    scopeType,
    status,
    search: search || undefined,
  });
  const { data: stats } = usePackageStats(broadcasterId);
  const { activatePackage, expirePackage, deletePackage } = useRightsPackageMutations();

  const handleCreate = () => {
    setEditTarget('new');
  };

  const handleEdit = (pkg: RightsPackage) => {
    setEditTarget(pkg);
  };

  const handleActivate = async (pkg: RightsPackage) => {
    await activatePackage.mutateAsync(pkg.id);
  };

  const handleExpire = async (pkg: RightsPackage) => {
    await expirePackage.mutateAsync(pkg.id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePackage.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <PackagesStatsCards stats={stats} isLoading={!stats} />

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PackagesFilters
          search={search}
          onSearchChange={setSearch}
          scopeType={scopeType}
          onScopeTypeChange={setScopeType}
          status={status}
          onStatusChange={setStatus}
        />
        <Button size="sm" className="shrink-0" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Table */}
      <PackagesTable
        packages={packages}
        isLoading={isLoading}
        onEdit={handleEdit}
        onActivate={handleActivate}
        onExpire={handleExpire}
        onDelete={setDeleteTarget}
      />

      {/* Edit/Create dialog */}
      <PackageEditDialog
        pkg={editTarget === 'new' ? null : editTarget}
        broadcasterId={broadcasterId}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement ce contrat.
              Les droits associés ne seront pas supprimés mais ne seront plus liés à ce contrat.
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
