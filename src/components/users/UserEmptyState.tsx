import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

interface UserEmptyStateProps {
  hasFilters?: boolean;
}

export function UserEmptyState({ hasFilters = false }: UserEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? t('users.noResults') : t('users.emptyTitle')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters ? t('users.noResultsDescription') : t('users.emptyDescription')}
      </p>
    </div>
  );
}
