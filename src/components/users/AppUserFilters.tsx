import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { AppUsersFilters } from '@/hooks/useAppUsers';

interface AppUserFiltersProps {
  filters: AppUsersFilters;
  onFiltersChange: (filters: AppUsersFilters) => void;
}

export function AppUserFilters({ filters, onFiltersChange }: AppUserFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('users.app.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as AppUsersFilters['status'] })}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          <SelectItem value="active">{t('users.app.status.active')}</SelectItem>
          <SelectItem value="banned">{t('users.app.status.banned')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
