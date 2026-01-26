import { useTranslation } from 'react-i18next';
import { Workflow } from 'lucide-react';

interface WorkflowEmptyStateProps {
  hasFilters?: boolean;
}

export function WorkflowEmptyState({ hasFilters = false }: WorkflowEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Workflow className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? t('workflows.noResults') : t('workflows.emptyTitle')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {hasFilters
          ? t('workflows.noResultsDescription')
          : t('workflows.emptyDescription')}
      </p>
    </div>
  );
}
