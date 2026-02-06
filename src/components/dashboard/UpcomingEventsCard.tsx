import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeStatusBadge } from '@/components/events/TimeStatusBadge';
import { useUpcomingEvents } from '@/hooks/useDashboard';

export function UpcomingEventsCard() {
  const { t } = useTranslation();
  const { data: events, isLoading } = useUpcomingEvents();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {t('dashboard.sections.upcomingEvents')}
        </CardTitle>
        <Link
          to="/events"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {t('dashboard.sections.viewAllEvents')}
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
        ) : !events?.length ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.sections.noUpcoming')}</p>
        ) : (
          events.map((event) => {
            const title = event.override_title || event.api_title || '—';
            return (
              <Link
                key={event.id}
                to="/events"
                className="flex items-center justify-between gap-2 rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.sport && (
                      <Badge variant="outline" className="text-xs py-0">
                        {event.sport}
                      </Badge>
                    )}
                    {event.league && (
                      <span className="text-xs text-muted-foreground truncate">{event.league}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.event_date), { addSuffix: true, locale: fr })}
                  </span>
                  <TimeStatusBadge eventDate={event.event_date} isLive={event.is_live ?? false} showLabel={false} />
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
