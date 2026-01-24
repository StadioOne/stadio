import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { CategoryFilters as CategoryFiltersType } from '@/hooks/useCategories';

interface CategoryFiltersProps {
  filters: CategoryFiltersType;
  onFiltersChange: (filters: CategoryFiltersType) => void;
}

export function CategoryFilters({ filters, onFiltersChange }: CategoryFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('categories.search')}
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ 
            ...filters, 
            status: value as CategoryFiltersType['status']
          })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('filters.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all')}</SelectItem>
          <SelectItem value="draft">{t('status.draft')}</SelectItem>
          <SelectItem value="published">{t('status.published')}</SelectItem>
          <SelectItem value="archived">{t('status.archived')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
