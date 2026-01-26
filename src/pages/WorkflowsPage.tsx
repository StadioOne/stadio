import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow } from 'lucide-react';
import { useWorkflowRuns, useWorkflowsStats, WorkflowsFilters, WorkflowRun } from '@/hooks/useWorkflows';
import { WorkflowStats } from '@/components/workflows/WorkflowStats';
import { WorkflowGrid } from '@/components/workflows/WorkflowGrid';
import { WorkflowFilters } from '@/components/workflows/WorkflowFilters';
import { WorkflowRunsTable } from '@/components/workflows/WorkflowRunsTable';
import { WorkflowRunDetailPanel } from '@/components/workflows/WorkflowRunDetailPanel';
import { WorkflowPagination } from '@/components/workflows/WorkflowPagination';

export default function WorkflowsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<WorkflowsFilters>({
    limit: 20,
    offset: 0,
  });
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useWorkflowsStats();
  const { data: runsData, isLoading: runsLoading } = useWorkflowRuns(filters);

  const hasFilters = !!(filters.workflow || (filters.status && filters.status !== 'all'));

  const handleViewDetail = (run: WorkflowRun) => {
    setSelectedRun(run);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Workflow className="h-8 w-8" />
            {t('workflows.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('workflows.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <WorkflowStats stats={stats} isLoading={statsLoading} />

      {/* Workflow Grid */}
      <WorkflowGrid />

      {/* History Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t('workflows.history')}</CardTitle>
            <WorkflowFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </CardHeader>
        <CardContent>
          <WorkflowRunsTable
            runs={runsData?.data ?? []}
            isLoading={runsLoading}
            hasFilters={hasFilters}
            onViewDetail={handleViewDetail}
          />
          <WorkflowPagination
            total={runsData?.meta.total ?? 0}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <WorkflowRunDetailPanel
        run={selectedRun}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
