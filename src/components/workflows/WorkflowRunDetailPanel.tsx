import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from './StatusBadge';
import { Clock, User, AlertCircle, FileInput, FileOutput, Timer } from 'lucide-react';
import type { WorkflowRun } from '@/hooks/useWorkflows';

interface WorkflowRunDetailPanelProps {
  run: WorkflowRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return '-';

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} secondes`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function JsonDisplay({ data }: { data: unknown }) {
  const { t } = useTranslation();

  if (data === null || data === undefined) {
    return (
      <p className="text-sm text-muted-foreground italic">{t('workflows.noData')}</p>
    );
  }

  return (
    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function WorkflowRunDetailPanel({
  run,
  open,
  onOpenChange,
}: WorkflowRunDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;

  if (!run) return null;

  const startedAtFormatted = run.started_at
    ? format(new Date(run.started_at), 'dd MMM yyyy HH:mm:ss', { locale })
    : '-';

  const finishedAtFormatted = run.finished_at
    ? format(new Date(run.finished_at), 'dd MMM yyyy HH:mm:ss', { locale })
    : '-';

  const triggeredByDisplay = run.triggered_by
    ? run.triggered_by.includes('@')
      ? run.triggered_by
      : t('workflows.automatic')
    : t('workflows.automatic');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('workflows.runDetail')}</SheetTitle>
          <SheetDescription className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{run.workflow_name}</span>
              {run.workflow_type && (
                <Badge variant="outline" className="text-xs">
                  {run.workflow_type}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              ID: {run.id.slice(0, 8)}...
            </div>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('workflows.status')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={run.status} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('workflows.startedAt')}</p>
                    <p className="font-medium">{startedAtFormatted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('workflows.finishedAt')}</p>
                    <p className="font-medium">{finishedAtFormatted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('workflows.duration')}:</span>
                  <span className="font-medium">{formatDuration(run.duration_ms)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Triggered By Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('workflows.triggeredBy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{triggeredByDisplay}</p>
              </CardContent>
            </Card>

            {/* Error Message */}
            {run.error_message && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {t('workflows.errorMessage')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-destructive/10 text-destructive p-3 rounded-md whitespace-pre-wrap break-words">
                    {run.error_message}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Input Data */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileInput className="h-4 w-4" />
                  {t('workflows.inputData')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JsonDisplay data={run.input_data} />
              </CardContent>
            </Card>

            {/* Output Data */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileOutput className="h-4 w-4" />
                  {t('workflows.outputData')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JsonDisplay data={run.output_data} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
