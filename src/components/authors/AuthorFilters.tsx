import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface AuthorFiltersProps {
  onSearchChange: (search: string) => void;
  onActiveChange: (isActive: boolean | 'all') => void;
  activeFilter: boolean | 'all';
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onCreateNew: () => void;
}

export function AuthorFilters({
  onSearchChange,
  onActiveChange,
  activeFilter,
  viewMode,
  onViewModeChange,
  onCreateNew,
}: AuthorFiltersProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  return (
    <div className="space-y-4">
      {/* Top row: Search + Create button */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('authors.searchPlaceholder')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('authors.newAuthor')}
        </Button>
      </div>

      {/* Bottom row: Status filters + View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={String(activeFilter)}
            onValueChange={(value) => {
              if (value === 'all') onActiveChange('all');
              else if (value === 'true') onActiveChange(true);
              else if (value === 'false') onActiveChange(false);
            }}
          >
            <ToggleGroupItem value="all" className="text-sm">
              {t('authors.allStatus')}
            </ToggleGroupItem>
            <ToggleGroupItem value="true" className="text-sm">
              {t('authors.activeOnly')}
            </ToggleGroupItem>
            <ToggleGroupItem value="false" className="text-sm">
              {t('authors.inactiveOnly')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as 'grid' | 'list')}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
