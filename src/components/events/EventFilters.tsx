import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LayoutGrid, List, Radio, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EventsFilters } from '@/hooks/useEvents';

type ViewMode = 'grid' | 'list';

interface EventFiltersProps {
  filters: EventsFilters;
  onFiltersChange: (filters: EventsFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sports: string[];
  leagues: string[];
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
] as const;

export function EventFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  sports,
  leagues,
}: EventFiltersProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timeoutId = setTimeout(() => {
        onFiltersChange({ ...filters, search: value || undefined, offset: 0 });
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [filters, onFiltersChange]
  );

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status as EventsFilters['status'],
      offset: 0,
    });
  };

  const handleSportChange = (sport: string) => {
    onFiltersChange({
      ...filters,
      sport: sport === 'all' ? undefined : sport,
      league: undefined, // Reset league when sport changes
      offset: 0,
    });
  };

  const handleLeagueChange = (league: string) => {
    onFiltersChange({
      ...filters,
      league: league === 'all' ? undefined : league,
      offset: 0,
    });
  };

  const toggleLiveFilter = () => {
    onFiltersChange({
      ...filters,
      isLive: filters.isLive ? undefined : true,
      offset: 0,
    });
  };

  const togglePinnedFilter = () => {
    onFiltersChange({
      ...filters,
      isPinned: filters.isPinned ? undefined : true,
      offset: 0,
    });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({
      limit: filters.limit,
      offset: 0,
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' &&
    filters.status !== undefined ||
    filters.sport ||
    filters.league ||
    filters.isLive ||
    filters.isPinned ||
    filters.search;

  // Filter leagues based on selected sport (if sport data is available)
  const filteredLeagues = filters.sport
    ? leagues
    : leagues;

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              viewMode === 'grid' && 'bg-background shadow-sm'
            )}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              viewMode === 'list' && 'bg-background shadow-sm'
            )}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Pills */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                (filters.status === option.value ||
                  (option.value === 'all' && !filters.status)) &&
                  'bg-primary text-primary-foreground',
                (filters.status !== option.value &&
                  !(option.value === 'all' && !filters.status)) &&
                  'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Sport Select */}
        <Select
          value={filters.sport || 'all'}
          onValueChange={handleSportChange}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sports</SelectItem>
            {sports.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* League Select */}
        <Select
          value={filters.league || 'all'}
          onValueChange={handleLeagueChange}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Ligue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les ligues</SelectItem>
            {filteredLeagues.map((league) => (
              <SelectItem key={league} value={league}>
                {league}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border" />

        {/* Toggle Filters */}
        <Toggle
          pressed={filters.isLive === true}
          onPressedChange={toggleLiveFilter}
          size="sm"
          className="gap-1.5 data-[state=on]:bg-status-live/10 data-[state=on]:text-status-live"
        >
          <Radio className="h-3.5 w-3.5" />
          Live
        </Toggle>

        <Toggle
          pressed={filters.isPinned === true}
          onPressedChange={togglePinnedFilter}
          size="sm"
          className="gap-1.5 data-[state=on]:bg-tier-gold/10 data-[state=on]:text-tier-gold"
        >
          <Star className="h-3.5 w-3.5" />
          Épinglés
        </Toggle>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
