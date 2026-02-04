import { Badge } from '@/components/ui/badge';
import { Monitor, Tv, MonitorPlay } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type RightsPlatform = Database['public']['Enums']['rights_platform'];

interface PlatformBadgeProps {
  platform: RightsPlatform;
  className?: string;
}

const platformConfig: Record<RightsPlatform, { label: string; icon: typeof Monitor }> = {
  ott: { label: 'OTT', icon: Monitor },
  linear: { label: 'Linéaire', icon: Tv },
  both: { label: 'OTT + Lin.', icon: MonitorPlay },
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
