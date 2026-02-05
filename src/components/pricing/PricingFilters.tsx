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
import type { PricingFilters } from '@/hooks/usePricing';
import type { Database } from '@/integrations/supabase/types';

type PricingTier = Database['public']['Enums']['pricing_tier'];

interface PricingFiltersProps {
  filters: PricingFilters;
  onFiltersChange: (filters: PricingFilters) => void;
}

export function PricingFilters({ filters, onFiltersChange }: PricingFiltersProps) {
  const { t } = useTranslation();

  const handleTierChange = (value: string) => {
    onFiltersChange({
      ...filters,
      tier: value as PricingTier | 'all',
      offset: 0,
    });
  };

  const handleOverrideTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      overrideType: value as 'all' | 'computed' | 'manual',
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
    (filters.tier && filters.tier !== 'all') ||
    (filters.overrideType && filters.overrideType !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    filters.search;

  const clearFilters = () => {
    onFiltersChange({
      tier: 'all',
      overrideType: 'all',
      status: 'all',
      search: '',
      limit: filters.limit,
      offset: 0,
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tier filter */}
      <Select value={filters.tier || 'all'} onValueChange={handleTierChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('pricing.tier')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')} Tiers</SelectItem>
          <SelectItem value="gold">{t('pricing.gold')}</SelectItem>
          <SelectItem value="silver">{t('pricing.silver')}</SelectItem>
          <SelectItem value="bronze">{t('pricing.bronze')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Override type filter */}
      <Select value={filters.overrideType || 'all'} onValueChange={handleOverrideTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          <SelectItem value="computed">{t('common.computed')}</SelectItem>
          <SelectItem value="manual">{t('common.manual')}</SelectItem>
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
