import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserX, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuthorsStats } from '@/hooks/useAuthors';

interface AuthorStatsProps {
  stats: AuthorsStats | undefined;
  isLoading: boolean;
}

export function AuthorStats({ stats, isLoading }: AuthorStatsProps) {
  const { t } = useTranslation();

  const items = [
    {
      label: t('authors.stats.total'),
      value: stats?.total ?? 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('authors.stats.active'),
      value: stats?.active ?? 0,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('authors.stats.inactive'),
      value: stats?.inactive ?? 0,
      icon: UserX,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: t('authors.stats.contents'),
      value: stats?.totalContents ?? 0,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
