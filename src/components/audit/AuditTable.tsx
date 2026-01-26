import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditRow } from './AuditRow';
import type { AuditLogEntry } from '@/hooks/useAuditLogs';

interface AuditTableProps {
  logs: AuditLogEntry[];
  isLoading: boolean;
  onRowClick: (log: AuditLogEntry) => void;
}

export function AuditTable({ logs, isLoading, onRowClick }: AuditTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">{t('audit.date')}</TableHead>
              <TableHead className="w-[220px]">{t('audit.actor')}</TableHead>
              <TableHead className="w-[120px]">{t('audit.action')}</TableHead>
              <TableHead className="w-[120px]">{t('audit.entity')}</TableHead>
              <TableHead>{t('audit.details')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground">{t('audit.noLogs')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">{t('audit.date')}</TableHead>
            <TableHead className="w-[220px]">{t('audit.actor')}</TableHead>
            <TableHead className="w-[120px]">{t('audit.action')}</TableHead>
            <TableHead className="w-[120px]">{t('audit.entity')}</TableHead>
            <TableHead>{t('audit.details')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <AuditRow 
              key={log.id} 
              log={log} 
              onClick={() => onRowClick(log)} 
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
