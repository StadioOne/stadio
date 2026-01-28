import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useN8nWorkflows } from '@/hooks/useN8nWorkflows';
import type { WorkflowStatus, WorkflowsFilters } from '@/hooks/useWorkflows';

interface WorkflowFiltersProps {
  filters: WorkflowsFilters;
  onFiltersChange: (filters: WorkflowsFilters) => void;
}

const STATUS_OPTIONS: (WorkflowStatus | 'all')[] = [
  'all',
  'pending',
  'running',
  'success',
  'failed',
];

export function WorkflowFilters({ filters, onFiltersChange }: WorkflowFiltersProps) {
  const { t } = useTranslation();
  const { data: workflows } = useN8nWorkflows();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Select
        value={filters.workflow ?? 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            workflow: value === 'all' ? undefined : value,
            offset: 0,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[200px] bg-background">
          <SelectValue placeholder={t('workflows.allWorkflows')} />
        </SelectTrigger>
        <SelectContent className="bg-background border">
          <SelectItem value="all">{t('workflows.allWorkflows')}</SelectItem>
          {workflows?.map((workflow) => (
            <SelectItem key={workflow.id} value={workflow.name}>
              {workflow.name.replace(/^[^\w\s]+\s*/, '')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value as WorkflowStatus | 'all',
            offset: 0,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[180px] bg-background">
          <SelectValue placeholder={t('workflows.allStatuses')} />
        </SelectTrigger>
        <SelectContent className="bg-background border">
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {status === 'all'
                ? t('workflows.allStatuses')
                : t(`workflows.statuses.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
