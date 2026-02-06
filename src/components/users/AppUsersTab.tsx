import { useState } from 'react';
import { useAppUsers, type AppUsersFilters, type AppUser } from '@/hooks/useAppUsers';
import { AppUserStats } from './AppUserStats';
import { AppUserFilters } from './AppUserFilters';
import { AppUserTable } from './AppUserTable';
import { AppUserDetailPanel } from './AppUserDetailPanel';

export function AppUsersTab() {
  const [filters, setFilters] = useState<AppUsersFilters>({});
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const { data, isLoading } = useAppUsers(filters);

  const hasFilters = !!(filters.search || (filters.status && filters.status !== 'all'));

  return (
    <div className="space-y-6">
      <AppUserStats stats={data?.stats} isLoading={isLoading} />
      <AppUserFilters filters={filters} onFiltersChange={setFilters} />
      <AppUserTable
        users={data?.users}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onSelectUser={setSelectedUser}
      />
      <AppUserDetailPanel
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
