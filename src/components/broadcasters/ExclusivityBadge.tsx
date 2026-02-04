import { Badge } from '@/components/ui/badge';
import { Lock, Users, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type RightsExclusivity = Database['public']['Enums']['rights_exclusivity'];

interface ExclusivityBadgeProps {
  exclusivity: RightsExclusivity;
  className?: string;
}

const exclusivityConfig: Record<RightsExclusivity, { label: string; icon: typeof Lock; className: string }> = {
  exclusive: { 
    label: 'Exclusif', 
    icon: Lock, 
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
  },
  shared: { 
    label: 'Partagé', 
    icon: Users, 
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
  },
  non_exclusive: { 
    label: 'Non-exclusif', 
    icon: Unlock, 
    className: 'bg-muted text-muted-foreground border-border' 
  },
};

export function ExclusivityBadge({ exclusivity, className }: ExclusivityBadgeProps) {
  const config = exclusivityConfig[exclusivity];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
