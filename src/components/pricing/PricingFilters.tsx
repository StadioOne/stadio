import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { PricingFilters as PricingFiltersType } from '@/hooks/usePricing';

interface PricingFiltersProps {
  filters: PricingFiltersType;
  onFiltersChange: (filters: PricingFiltersType) => void;
}

export function PricingFilters({ filters, onFiltersChange }: PricingFiltersProps) {
  const { t } = useTranslation();

  const handlePriceStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      priceStatus: value as 'all' | 'with_price' | 'without_price',
      offset: 0,
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as 'all' | 'draft' | 'published',
      offset: 0,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
      offset: 0,
    });
  };

  const hasActiveFilters =
    (filters.priceStatus && filters.priceStatus !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    filters.search;

  const clearFilters = () => {
    onFiltersChange({
      priceStatus: 'all',
      status: 'all',
      search: '',
      limit: filters.limit,
      offset: 0,
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Price status filter */}
      <Select value={filters.priceStatus || 'all'} onValueChange={handlePriceStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Prix" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          <SelectItem value="with_price">Avec prix</SelectItem>
          <SelectItem value="without_price">Sans prix</SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('common.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          <SelectItem value="draft">{t('common.draft')}</SelectItem>
          <SelectItem value="published">{t('common.published')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t('common.clearFilters')}
        </Button>
      )}
    </div>
  );
}
