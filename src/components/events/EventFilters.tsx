import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LayoutGrid, List, Radio, Star, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
export type TimeStatusFilter = 'all' | 'upcoming' | 'ongoing' | 'finished';

interface EventFiltersProps {
  filters: EventsFilters;
  onFiltersChange: (filters: EventsFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sports: string[];
  leagues: string[];
  timeStatus: TimeStatusFilter;
  onTimeStatusChange: (status: TimeStatusFilter) => void;
}

export function EventFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  sports,
  leagues,
  timeStatus,
  onTimeStatusChange,
}: EventFiltersProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      status: status === 'all' ? undefined : status as EventsFilters['status'],
      offset: 0,
    });
  };

  const handleSportChange = (sport: string) => {
    onFiltersChange({
      ...filters,
      sport: sport === 'all' ? undefined : sport,
      league: undefined,
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
    onTimeStatusChange('all');
    onFiltersChange({ limit: filters.limit, offset: 0 });
  };

  const activeStatus = filters.status || 'all';

  // Count active advanced filters
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sport) count++;
    if (filters.league) count++;
    if (filters.isLive) count++;
    if (filters.isPinned) count++;
    if (timeStatus !== 'all') count++;
    return count;
  }, [filters.sport, filters.league, filters.isLive, filters.isPinned, timeStatus]);

  const hasActiveFilters = !!(
    filters.status ||
    filters.sport ||
    filters.league ||
    filters.isLive ||
    filters.isPinned ||
    filters.search ||
    timeStatus !== 'all'
  );

  return (
    <div className="space-y-3">
      {/* Main row: Search + Status Tabs + View Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Tabs */}
        <Tabs value={activeStatus} onValueChange={handleStatusChange} className="flex-shrink-0">
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="draft">Brouillon</TabsTrigger>
            <TabsTrigger value="published">Publié</TabsTrigger>
            <TabsTrigger value="archived">Archivé</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Advanced filters trigger + View toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtres
                {advancedFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-0.5">
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
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
      </div>

      {/* Advanced Filters Panel (Collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            {/* Sport Select */}
            <Select value={filters.sport || 'all'} onValueChange={handleSportChange}>
              <SelectTrigger className="w-[150px] h-9 bg-background">
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
            <Select value={filters.league || 'all'} onValueChange={handleLeagueChange}>
              <SelectTrigger className="w-[170px] h-9 bg-background">
                <SelectValue placeholder="Ligue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les ligues</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league} value={league}>
                    {league}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border" />

            {/* Time status pills */}
            <div className="flex items-center gap-1">
              {(['all', 'upcoming', 'ongoing', 'finished'] as const).map((ts) => {
                const labels = { all: 'Temps: Tous', upcoming: 'À venir', ongoing: 'En cours', finished: 'Terminés' };
                return (
                  <button
                    key={ts}
                    onClick={() => onTimeStatusChange(ts)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      timeStatus === ts
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted text-muted-foreground border border-border/50'
                    )}
                  >
                    {labels[ts]}
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Live & Pinned toggles */}
            <Toggle
              pressed={filters.isLive === true}
              onPressedChange={toggleLiveFilter}
              size="sm"
              className="gap-1.5 h-8 data-[state=on]:bg-status-live/10 data-[state=on]:text-status-live"
            >
              <Radio className="h-3.5 w-3.5" />
              Live
            </Toggle>

            <Toggle
              pressed={filters.isPinned === true}
              onPressedChange={togglePinnedFilter}
              size="sm"
              className="gap-1.5 h-8 data-[state=on]:bg-tier-gold/10 data-[state=on]:text-tier-gold"
            >
              <Star className="h-3.5 w-3.5" />
              Épinglés
            </Toggle>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
