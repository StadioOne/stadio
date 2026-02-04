import { Radio, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBroadcastersStats } from '@/hooks/useBroadcasters';

export function BroadcasterStats() {
  const { data: stats, isLoading } = useBroadcastersStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total diffuseurs',
      value: stats?.total || 0,
      icon: Radio,
      color: 'text-foreground',
    },
    {
      label: 'Actifs',
      value: stats?.active || 0,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      label: 'Suspendus',
      value: stats?.suspended || 0,
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      label: 'Droits actifs',
      value: stats?.activeRights || 0,
      icon: FileText,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
