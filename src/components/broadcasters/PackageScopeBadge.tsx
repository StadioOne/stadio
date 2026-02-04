import { Badge } from '@/components/ui/badge';
import { Trophy, Flag, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PackageScope = Database['public']['Enums']['package_scope'];

interface PackageScopeBadgeProps {
  scope: PackageScope;
  className?: string;
}

const scopeConfig: Record<PackageScope, { label: string; icon: typeof Trophy; className: string }> = {
  sport: { 
    label: 'Sport', 
    icon: Trophy, 
    className: 'bg-primary/10 text-primary border-primary/20' 
  },
  competition: { 
    label: 'Compétition', 
    icon: Flag, 
    className: 'bg-secondary/80 text-secondary-foreground border-secondary' 
  },
  season: { 
    label: 'Saison', 
    icon: Calendar, 
    className: 'bg-muted text-muted-foreground border-border' 
  },
};

export function PackageScopeBadge({ scope, className }: PackageScopeBadgeProps) {
  const config = scopeConfig[scope];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
