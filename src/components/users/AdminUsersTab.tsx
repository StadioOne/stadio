import { useState } from 'react';
import { useUsers, useUsersStats, type UsersFilters, type UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { UserStats } from './UserStats';
import { UserFilters } from './UserFilters';
import { UserTable } from './UserTable';
import { UserDetailPanel } from './UserDetailPanel';

export function AdminUsersTab() {
  const { role } = useAuth();
  const [filters, setFilters] = useState<UsersFilters>({});
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const { data: users, isLoading } = useUsers(filters);
  const { data: stats, isLoading: statsLoading } = useUsersStats();

  const isOwner = role === 'owner';

  return (
    <div className="space-y-6">
      <UserStats stats={stats} isLoading={statsLoading} />
      <UserFilters filters={filters} onFiltersChange={setFilters} />
      <UserTable
        users={users}
        isLoading={isLoading}
        filters={filters}
        onSelectUser={setSelectedUser}
      />
      <UserDetailPanel
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        isOwner={isOwner}
      />
    </div>
  );
}
