import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Ban, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppUserStats as Stats } from '@/hooks/useAppUsers';

interface AppUserStatsProps {
  stats: Stats | undefined;
  isLoading: boolean;
}

export function AppUserStats({ stats, isLoading }: AppUserStatsProps) {
  const { t } = useTranslation();

  const statItems = [
    { key: 'total', icon: Users, value: stats?.total, color: 'text-foreground' },
    { key: 'active', icon: UserCheck, value: stats?.active, color: 'text-green-600 dark:text-green-400' },
    { key: 'banned', icon: Ban, value: stats?.banned, color: 'text-red-600 dark:text-red-400' },
    { key: 'newLast30d', icon: UserPlus, value: stats?.newLast30d, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm text-muted-foreground">
                  {t(`users.app.stats.${item.key}`)}
                </span>
              </div>
              <div className="mt-1">
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-semibold">{item.value ?? 0}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
