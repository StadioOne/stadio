import { FileText, Headphones, Video, Globe, FileEdit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OriginalsStats } from '@/hooks/useOriginals';

interface OriginalStatsProps {
  stats: OriginalsStats | undefined;
  isLoading: boolean;
}

export function OriginalStats({ stats, isLoading }: OriginalStatsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-32 flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    { 
      label: t('originals.stats.total'), 
      value: stats.total, 
      icon: FileText,
      color: 'text-foreground',
    },
    { 
      label: t('originals.types.article'), 
      value: stats.articles, 
      icon: FileText,
      color: 'text-blue-500',
    },
    { 
      label: t('originals.types.podcast'), 
      value: stats.podcasts, 
      icon: Headphones,
      color: 'text-purple-500',
    },
    { 
      label: t('originals.types.emission'), 
      value: stats.emissions, 
      icon: Video,
      color: 'text-orange-500',
    },
    { 
      label: t('status.published'), 
      value: stats.published, 
      icon: Globe,
      color: 'text-green-500',
    },
    { 
      label: t('status.draft'), 
      value: stats.draft, 
      icon: FileEdit,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-muted/30"
          >
            <Icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-lg font-semibold leading-none">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
