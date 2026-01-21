import { useTranslation } from 'react-i18next';
import { Check, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActiveBadgeProps {
  isActive: boolean;
  className?: string;
}

export function ActiveBadge({ isActive, className }: ActiveBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        isActive 
          ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400' 
          : 'border-muted bg-muted/50 text-muted-foreground',
        className
      )}
    >
      {isActive ? (
        <>
          <Check className="h-3 w-3" />
          {t('authors.active')}
        </>
      ) : (
        <>
          <Pause className="h-3 w-3" />
          {t('authors.inactive')}
        </>
      )}
    </Badge>
  );
}
