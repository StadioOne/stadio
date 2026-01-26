import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuditLogs, useAuditFilterOptions, type AuditLogsFilters, type AuditLogEntry } from '@/hooks/useAuditLogs';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { AuditTable } from '@/components/audit/AuditTable';
import { AuditPagination } from '@/components/audit/AuditPagination';
import { AuditDetailPanel } from '@/components/audit/AuditDetailPanel';

export default function AuditLogPage() {
  const { t } = useTranslation();
  
  // Initialize filters with last 7 days
  const [filters, setFilters] = useState<AuditLogsFilters>({
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    limit: 50,
    offset: 0,
  });
  
  // Selected log for detail panel
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Fetch audit logs
  const { data, isLoading, error } = useAuditLogs(filters);
  
  // Fetch filter options
  const { data: filterOptions } = useAuditFilterOptions();

  const handleRowClick = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailPanelOpen(true);
  };

  const handlePageChange = (offset: number) => {
    setFilters(prev => ({ ...prev, offset }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.audit')}</h1>
          <p className="text-muted-foreground mt-1">{t('audit.description')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : t('audit.errorLoading')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="h-5 w-5" />
            {t('audit.logsTitle')}
          </CardTitle>
          <CardDescription>
            {data?.pagination.total !== undefined && (
              <span>
                {t('audit.totalEntries', { count: data.pagination.total })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditFilters
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions || { actors: [], actions: [], entities: [] }}
          />
          
          <AuditTable
            logs={data?.logs || []}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
          
          {data?.pagination && (
            <AuditPagination
              pagination={data.pagination}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      <AuditDetailPanel
        log={selectedLog}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />
    </div>
  );
}
