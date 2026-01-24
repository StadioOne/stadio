import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Eye, FileEdit } from 'lucide-react';

interface CategoryStatsProps {
  stats?: {
    total: number;
    published: number;
    draft: number;
  };
  isLoading?: boolean;
}

export function CategoryStats({ stats, isLoading }: CategoryStatsProps) {
  const { t } = useTranslation();

  const items = [
    {
      label: t('categories.stats.total'),
      value: stats?.total ?? 0,
      icon: FolderOpen,
      color: 'text-primary',
    },
    {
      label: t('categories.stats.published'),
      value: stats?.published ?? 0,
      icon: Eye,
      color: 'text-success',
    },
    {
      label: t('categories.stats.draft'),
      value: stats?.draft ?? 0,
      icon: FileEdit,
      color: 'text-muted-foreground',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                <item.icon className="h-5 w-5" />
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
