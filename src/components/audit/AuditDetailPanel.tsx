import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActionBadge } from './ActionBadge';
import { EntityBadge } from './EntityBadge';
import { RoleBadge } from './RoleBadge';
import { DiffViewer } from './DiffViewer';
import { Globe, Clock, User, FileJson } from 'lucide-react';
import type { AuditLogEntry } from '@/hooks/useAuditLogs';

interface AuditDetailPanelProps {
  log: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailPanel({ log, open, onOpenChange }: AuditDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;

  if (!log) return null;

  const formattedDate = format(new Date(log.createdAt), 'dd MMMM yyyy à HH:mm:ss', { locale });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t('audit.actionDetail')}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Action summary */}
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={log.action} />
              <EntityBadge entity={log.entity} />
            </div>

            {/* Entity ID */}
            {log.entityId && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('audit.entityId')}
                </label>
                <div className="font-mono text-sm bg-muted p-2 rounded-md break-all">
                  {log.entityId}
                </div>
              </div>
            )}

            <Separator />

            {/* Actor info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                {t('audit.actor')}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {log.actorEmail || 'Système'}
                  </span>
                  <RoleBadge role={log.actorRole} />
                </div>
                
                {log.ipAddress && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {log.ipAddress}
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formattedDate}
                </div>
              </div>
            </div>

            <Separator />

            {/* Diff viewer */}
            <div className="space-y-3">
              <div className="text-sm font-medium">{t('audit.changes')}</div>
              <DiffViewer 
                before={log.diff.before} 
                after={log.diff.after} 
              />
            </div>

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    {t('audit.metadata')}
                  </div>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
