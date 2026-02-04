import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RightsExclusivity, RightsStatus } from '@/hooks/useRightsEvents';

interface RightsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  exclusivity: RightsExclusivity | 'all';
  onExclusivityChange: (value: RightsExclusivity | 'all') => void;
  status: RightsStatus | 'all';
  onStatusChange: (value: RightsStatus | 'all') => void;
}

export function RightsFilters({
  search,
  onSearchChange,
  exclusivity,
  onExclusivityChange,
  status,
  onStatusChange,
}: RightsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un événement..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={exclusivity} onValueChange={onExclusivityChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Exclusivité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="exclusive">Exclusif</SelectItem>
          <SelectItem value="shared">Partagé</SelectItem>
          <SelectItem value="non_exclusive">Non-exclusif</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
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
