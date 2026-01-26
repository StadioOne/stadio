import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkflowRunRow } from './WorkflowRunRow';
import { WorkflowEmptyState } from './WorkflowEmptyState';
import type { WorkflowRun, WorkflowsFilters } from '@/hooks/useWorkflows';

interface WorkflowRunsTableProps {
  runs: WorkflowRun[];
  isLoading: boolean;
  hasFilters: boolean;
  onViewDetail: (run: WorkflowRun) => void;
}

export function WorkflowRunsTable({
  runs,
  isLoading,
  hasFilters,
  onViewDetail,
}: WorkflowRunsTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return <WorkflowEmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.date')}</TableHead>
            <TableHead>{t('workflows.workflow')}</TableHead>
            <TableHead>{t('workflows.triggeredBy')}</TableHead>
            <TableHead>{t('workflows.status')}</TableHead>
            <TableHead>{t('workflows.duration')}</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <WorkflowRunRow
              key={run.id}
              run={run}
              onViewDetail={onViewDetail}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
