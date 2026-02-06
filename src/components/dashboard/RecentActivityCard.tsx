import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ActionBadge } from '@/components/audit/ActionBadge';
import { useRecentActivity } from '@/hooks/useDashboard';

export function RecentActivityCard() {
  const { t } = useTranslation();
  const { data: activities, isLoading } = useRecentActivity();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('dashboard.sections.recentActivity')}
        </CardTitle>
        <Link
          to="/audit"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {t('dashboard.sections.viewAuditLog')}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : !activities?.length ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.sections.noActivity')}</p>
        ) : (
          activities.map((entry) => {
            const actorName = entry.actor_email?.split('@')[0] ?? '—';
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md p-2 -mx-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ActionBadge action={entry.action} />
                  <span className="text-sm truncate">
                    <span className="font-medium">{actorName}</span>
                    {' · '}
                    <span className="text-muted-foreground">{entry.entity}</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
