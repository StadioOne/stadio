import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRow } from './UserRow';
import { UserEmptyState } from './UserEmptyState';
import type { UserWithRole, UsersFilters } from '@/hooks/useUsers';

interface UserTableProps {
  users: UserWithRole[] | undefined;
  isLoading: boolean;
  filters: UsersFilters;
  onSelectUser: (user: UserWithRole) => void;
}

function UserTableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <td className="p-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
          <td className="p-4"><Skeleton className="h-4 w-32" /></td>
          <td className="p-4"><Skeleton className="h-4 w-48" /></td>
          <td className="p-4"><Skeleton className="h-5 w-16" /></td>
          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
          <td className="p-4"><Skeleton className="h-8 w-8" /></td>
        </TableRow>
      ))}
    </>
  );
}

export function UserTable({ users, isLoading, filters, onSelectUser }: UserTableProps) {
  const { t } = useTranslation();

  const hasFilters = !!(filters.search || (filters.role && filters.role !== 'all'));

  if (!isLoading && (!users || users.length === 0)) {
    return <UserEmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('common.email')}</TableHead>
            <TableHead>{t('users.role')}</TableHead>
            <TableHead>{t('users.memberSince')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <UserTableSkeleton />
          ) : (
            users?.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSelect={onSelectUser}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
