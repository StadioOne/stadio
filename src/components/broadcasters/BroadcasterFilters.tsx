import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BroadcasterStatus } from '@/hooks/useBroadcasters';

interface BroadcasterFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: BroadcasterStatus | 'all';
  onStatusChange: (value: BroadcasterStatus | 'all') => void;
}

export function BroadcasterFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: BroadcasterFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un diffuseur..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as BroadcasterStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="active">Actif</SelectItem>
          <SelectItem value="suspended">Suspendu</SelectItem>
          <SelectItem value="pending">En attente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
