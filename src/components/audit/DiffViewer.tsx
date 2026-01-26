import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DiffViewerProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  className?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getChangedKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): string[] {
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  
  return Array.from(allKeys).filter(key => {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];
    return JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
  });
}

export function DiffViewer({ before, after, className }: DiffViewerProps) {
  const { t } = useTranslation();
  const changedKeys = getChangedKeys(before, after);
  
  if (changedKeys.length === 0) {
    return (
      <div className={cn('text-muted-foreground text-sm italic', className)}>
        {t('audit.noChanges')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 font-mono text-sm', className)}>
      {changedKeys.map(key => {
        const beforeVal = before?.[key];
        const afterVal = after?.[key];
        
        return (
          <div key={key} className="rounded-md border bg-muted/50 p-3">
            <div className="font-semibold text-foreground mb-1">{key}</div>
            <div className="grid gap-1">
              {before && key in before && (
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 shrink-0">−</span>
                  <span className="text-red-600 dark:text-red-400 break-all">
                    {formatValue(beforeVal)}
                  </span>
                </div>
              )}
              {after && key in after && (
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 shrink-0">+</span>
                  <span className="text-green-600 dark:text-green-400 break-all">
                    {formatValue(afterVal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
