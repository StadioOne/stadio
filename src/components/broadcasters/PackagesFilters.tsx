import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PackageScope, RightsStatus } from '@/hooks/useRightsPackages';

interface PackagesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  scopeType: PackageScope | 'all';
  onScopeTypeChange: (value: PackageScope | 'all') => void;
  status: RightsStatus | 'all';
  onStatusChange: (value: RightsStatus | 'all') => void;
}

export function PackagesFilters({
  search,
  onSearchChange,
  scopeType,
  onScopeTypeChange,
  status,
  onStatusChange,
}: PackagesFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-48"
        />
      </div>

      <Select value={scopeType} onValueChange={onScopeTypeChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Périmètre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="sport">Sport</SelectItem>
          <SelectItem value="competition">Compétition</SelectItem>
          <SelectItem value="season">Saison</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="draft">Brouillon</SelectItem>
          <SelectItem value="active">Actif</SelectItem>
          <SelectItem value="expired">Expiré</SelectItem>
          <SelectItem value="revoked">Révoqué</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
