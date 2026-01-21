import { useState, useCallback } from 'react';
import { Search, LayoutGrid, List, Plus, FileText, Headphones, Video, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { OriginalsFilters } from '@/hooks/useOriginals';
import type { Author } from '@/lib/api-types';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];
type ContentStatus = Database['public']['Enums']['content_status'];

interface OriginalFiltersProps {
  filters: OriginalsFilters;
  onFiltersChange: (filters: OriginalsFilters) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  authors: Author[];
  onCreateNew: (type: OriginalType) => void;
}

const statusOptions: { value: ContentStatus | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'draft', labelKey: 'status.draft' },
  { value: 'published', labelKey: 'status.published' },
  { value: 'archived', labelKey: 'status.archived' },
];

const typeOptions: { value: OriginalType | 'all'; labelKey: string; icon: typeof FileText }[] = [
  { value: 'all', labelKey: 'common.all', icon: FileText },
  { value: 'article', labelKey: 'originals.types.article', icon: FileText },
  { value: 'podcast', labelKey: 'originals.types.podcast', icon: Headphones },
  { value: 'emission', labelKey: 'originals.types.emission', icon: Video },
];

export function OriginalFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  authors,
  onCreateNew,
}: OriginalFiltersProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined, offset: 0 });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  const handleStatusChange = (status: ContentStatus | 'all') => {
    onFiltersChange({ 
      ...filters, 
      status: status === 'all' ? undefined : status,
      offset: 0,
    });
  };

  const handleTypeChange = (type: OriginalType | 'all') => {
    onFiltersChange({ 
      ...filters, 
      type: type === 'all' ? undefined : type,
      offset: 0,
    });
  };

  const handleAuthorChange = (authorId: string) => {
    onFiltersChange({ 
      ...filters, 
      authorId: authorId === 'all' ? undefined : authorId,
      offset: 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top row: Search + Create button */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('originals.searchPlaceholder')}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('originals.createContent')}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onCreateNew('article')}>
              <FileText className="h-4 w-4 mr-2 text-blue-500" />
              {t('originals.types.article')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateNew('podcast')}>
              <Headphones className="h-4 w-4 mr-2 text-purple-500" />
              {t('originals.types.podcast')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateNew('emission')}>
              <Video className="h-4 w-4 mr-2 text-orange-500" />
              {t('originals.types.emission')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Type chips */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = (filters.type || 'all') === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleTypeChange(option.value)}
                  className={cn(
                    'h-8 text-xs gap-1',
                    isActive && 'bg-background shadow-sm'
                  )}
                >
                  {option.value !== 'all' && <Icon className="h-3 w-3" />}
                  {t(option.labelKey)}
                </Button>
              );
            })}
          </div>

          {/* Status select */}
          <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Author select */}
          <Select
            value={filters.authorId || 'all'}
            onValueChange={handleAuthorChange}
          >
            <SelectTrigger className="w-44 h-8">
              <SelectValue placeholder={t('originals.author')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('originals.allAuthors')}</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Toggle
            pressed={viewMode === 'grid'}
            onPressedChange={() => onViewModeChange('grid')}
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Vue grille"
          >
            <LayoutGrid className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={viewMode === 'list'}
            onPressedChange={() => onViewModeChange('list')}
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Vue liste"
          >
            <List className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
}
