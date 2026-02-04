import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageRow } from './PackageRow';
import type { RightsPackage } from '@/hooks/useRightsPackages';

interface PackagesTableProps {
  packages?: RightsPackage[];
  isLoading: boolean;
  onEdit: (pkg: RightsPackage) => void;
  onActivate: (pkg: RightsPackage) => void;
  onExpire: (pkg: RightsPackage) => void;
  onDelete: (pkg: RightsPackage) => void;
}

export function PackagesTable({
  packages,
  isLoading,
  onEdit,
  onActivate,
  onExpire,
  onDelete,
}: PackagesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!packages?.length) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-muted-foreground">Aucun contrat trouvé</p>
        <p className="text-sm text-muted-foreground mt-1">
          Créez un contrat pour attribuer des droits en masse
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Périmètre</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Territoires</TableHead>
            <TableHead>Droits</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              onEdit={onEdit}
              onActivate={onActivate}
              onExpire={onExpire}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
