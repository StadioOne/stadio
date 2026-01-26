import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { UsersFilters } from '@/hooks/useUsers';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

interface UserFiltersProps {
  filters: UsersFilters;
  onFiltersChange: (filters: UsersFilters) => void;
}

const roles: AdminRole[] = ['owner', 'admin', 'editor', 'support'];

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('users.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.role || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, role: value as AdminRole | 'all' })}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('users.allRoles')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('users.allRoles')}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {t(`users.roles.${role}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
