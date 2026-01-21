import { FileText, Headphones, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];

interface TypeBadgeProps {
  type: OriginalType;
  className?: string;
  showLabel?: boolean;
}

const typeConfig = {
  article: {
    icon: FileText,
    colorClasses: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  podcast: {
    icon: Headphones,
    colorClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  emission: {
    icon: Video,
    colorClasses: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
};

export function TypeBadge({ type, className, showLabel = true }: TypeBadgeProps) {
  const { t } = useTranslation();
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        config.colorClasses,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{t(`originals.types.${type}`)}</span>}
    </Badge>
  );
}
