import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useUsers, useUsersStats, type UsersFilters, type UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { UserStats } from '@/components/users/UserStats';
import { UserFilters } from '@/components/users/UserFilters';
import { UserTable } from '@/components/users/UserTable';
import { UserDetailPanel } from '@/components/users/UserDetailPanel';
import { AddUserDialog } from '@/components/users/AddUserDialog';

export default function UsersPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  
  const [filters, setFilters] = useState<UsersFilters>({});
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: users, isLoading } = useUsers(filters);
  const { data: stats, isLoading: statsLoading } = useUsersStats();

  const isOwner = role === 'owner';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('users.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('users.subtitle')}</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('users.newAdmin')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <UserStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <UserFilters filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      <UserTable
        users={users}
        isLoading={isLoading}
        filters={filters}
        onSelectUser={setSelectedUser}
      />

      {/* Detail Panel */}
      <UserDetailPanel
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        isOwner={isOwner}
      />

      {/* Add User Dialog */}
      <AddUserDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </div>
  );
}
