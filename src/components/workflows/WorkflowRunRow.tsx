import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { WorkflowRun } from '@/hooks/useWorkflows';

interface WorkflowRunRowProps {
  run: WorkflowRun;
  onViewDetail: (run: WorkflowRun) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return '-';

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function WorkflowRunRow({ run, onViewDetail }: WorkflowRunRowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;

  const dateFormatted = format(new Date(run.created_at), 'dd MMM yyyy HH:mm', {
    locale,
  });

  const triggeredByDisplay = run.triggered_by
    ? run.triggered_by.includes('@')
      ? run.triggered_by
      : t('workflows.automatic')
    : t('workflows.automatic');

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewDetail(run)}
    >
      <TableCell className="font-medium">{dateFormatted}</TableCell>
      <TableCell>{run.workflow_name}</TableCell>
      <TableCell className="max-w-[200px] truncate text-muted-foreground">
        {triggeredByDisplay}
      </TableCell>
      <TableCell>
        <StatusBadge status={run.status} size="sm" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDuration(run.duration_ms)}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={(e) => {
          e.stopPropagation();
          onViewDetail(run);
        }}>
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
