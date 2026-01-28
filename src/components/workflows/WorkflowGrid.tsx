import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useN8nWorkflows } from '@/hooks/useN8nWorkflows';
import { N8nWorkflowCard } from './N8nWorkflowCard';

export function WorkflowGrid() {
  const { t } = useTranslation();
  const { data: workflows, isLoading, error } = useN8nWorkflows();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('workflows.availableWorkflows')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('workflows.availableWorkflows')}</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('workflows.fetchError')}: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('workflows.availableWorkflows')}</h2>
        <p className="text-muted-foreground">{t('workflows.noWorkflows')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('workflows.availableWorkflows')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <N8nWorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
}
