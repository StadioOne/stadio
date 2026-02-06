import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AppUserRow } from './AppUserRow';
import { UserEmptyState } from './UserEmptyState';
import type { AppUser } from '@/hooks/useAppUsers';

interface AppUserTableProps {
  users: AppUser[] | undefined;
  isLoading: boolean;
  hasFilters: boolean;
  onSelectUser: (user: AppUser) => void;
}

function AppUserTableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <td className="p-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
          <td className="p-4"><Skeleton className="h-4 w-40" /></td>
          <td className="p-4"><Skeleton className="h-5 w-16" /></td>
          <td className="p-4"><Skeleton className="h-4 w-20" /></td>
          <td className="p-4"><Skeleton className="h-4 w-20" /></td>
          <td className="p-4"><Skeleton className="h-8 w-8" /></td>
        </TableRow>
      ))}
    </>
  );
}

export function AppUserTable({ users, isLoading, hasFilters, onSelectUser }: AppUserTableProps) {
  const { t } = useTranslation();

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
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('users.app.registered')}</TableHead>
            <TableHead>{t('users.app.lastLogin')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <AppUserTableSkeleton />
          ) : (
            users?.map((user) => (
              <AppUserRow key={user.id} user={user} onSelect={onSelectUser} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
