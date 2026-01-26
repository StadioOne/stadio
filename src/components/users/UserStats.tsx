import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Crown, Shield, Pencil, HeadphonesIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { UsersStats } from '@/hooks/useUsers';

interface UserStatsProps {
  stats: UsersStats | undefined;
  isLoading: boolean;
}

export function UserStats({ stats, isLoading }: UserStatsProps) {
  const { t } = useTranslation();

  const statItems = [
    { key: 'total', icon: Users, value: stats?.total, color: 'text-foreground' },
    { key: 'owners', icon: Crown, value: stats?.owners, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'admins', icon: Shield, value: stats?.admins, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'editors', icon: Pencil, value: stats?.editors, color: 'text-green-600 dark:text-green-400' },
    { key: 'support', icon: HeadphonesIcon, value: stats?.support, color: 'text-gray-600 dark:text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm text-muted-foreground">
                  {t(`users.stats.${item.key}`)}
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
