import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { TableCell, TableRow } from '@/components/ui/table';
import { ActionBadge } from './ActionBadge';
import { EntityBadge } from './EntityBadge';
import { RoleBadge } from './RoleBadge';
import type { AuditLogEntry } from '@/hooks/useAuditLogs';

interface AuditRowProps {
  log: AuditLogEntry;
  onClick: () => void;
}

function getDetailsSummary(log: AuditLogEntry): string {
  // Try to extract a meaningful summary from the log
  const after = log.diff.after as Record<string, unknown> | null;
  const before = log.diff.before as Record<string, unknown> | null;
  const metadata = log.metadata as Record<string, unknown> | null;
  
  // Check for common title fields
  const title = 
    after?.title || 
    after?.title_fr || 
    after?.name || 
    after?.name_fr ||
    before?.title || 
    before?.title_fr || 
    before?.name || 
    before?.name_fr ||
    metadata?.title ||
    metadata?.event_title ||
    metadata?.original_title;
  
  if (title) return String(title);
  
  // Check for entity ID
  if (log.entityId) {
    return log.entityId.slice(0, 8) + '...';
  }
  
  return '—';
}

export function AuditRow({ log, onClick }: AuditRowProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  
  const formattedDate = format(new Date(log.createdAt), 'dd MMM HH:mm', { locale });
  const detailsSummary = getDetailsSummary(log);

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <TableCell className="font-medium text-sm">
        {formattedDate}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-sm font-medium truncate max-w-[200px]">
            {log.actorEmail || 'Système'}
          </div>
          <RoleBadge role={log.actorRole} />
        </div>
      </TableCell>
      <TableCell>
        <ActionBadge action={log.action} />
      </TableCell>
      <TableCell>
        <EntityBadge entity={log.entity} />
      </TableCell>
      <TableCell className="max-w-[300px]">
        <span className="text-sm text-muted-foreground truncate block">
          {detailsSummary}
        </span>
      </TableCell>
    </TableRow>
  );
}
