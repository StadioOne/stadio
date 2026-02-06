import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Eye, Radio, FileText, PenTool, FolderOpen, CalendarClock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardKPIs } from '@/hooks/useDashboard';

interface KPICardProps {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  isLoading: boolean;
  colorClass?: string;
  pulse?: boolean;
}

function KPICard({ label, value, icon: Icon, isLoading, colorClass, pulse }: KPICardProps) {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', colorClass, pulse && 'animate-pulse')} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardKPIGrid() {
  const { t } = useTranslation();
  const { data: kpis, isLoading } = useDashboardKPIs();

  const row1 = [
    { label: t('dashboard.kpis.totalEvents'), value: kpis?.totalEvents, icon: Calendar, colorClass: '' },
    { label: t('dashboard.kpis.publishedEvents'), value: kpis?.publishedEvents, icon: Eye, colorClass: 'text-green-500' },
    { label: t('dashboard.kpis.liveEvents'), value: kpis?.liveEvents, icon: Radio, colorClass: 'text-destructive', pulse: (kpis?.liveEvents ?? 0) > 0 },
    { label: t('dashboard.kpis.publishedOriginals'), value: kpis?.publishedOriginals, icon: FileText, colorClass: 'text-primary' },
  ];

  const row2 = [
    { label: t('dashboard.kpis.activeAuthors'), value: kpis?.totalAuthors, icon: PenTool, colorClass: '' },
    { label: t('dashboard.kpis.visibleCategories'), value: kpis?.totalCategories, icon: FolderOpen, colorClass: '' },
    { label: t('dashboard.kpis.upcomingNext24h'), value: undefined as number | undefined, icon: CalendarClock, colorClass: 'text-blue-500' },
    { label: t('dashboard.kpis.recentWorkflows'), value: kpis?.recentWorkflows, icon: Zap, colorClass: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {row1.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} isLoading={isLoading} />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {row2.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
