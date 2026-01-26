import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Film, 
  Folder, 
  User, 
  DollarSign, 
  BarChart3, 
  Settings,
  Zap,
  Users,
  LucideIcon
} from 'lucide-react';

interface EntityBadgeProps {
  entity: string;
  className?: string;
}

const entityConfig: Record<string, { icon: LucideIcon; style: string }> = {
  events: { 
    icon: Calendar, 
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  originals: { 
    icon: Film, 
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
  },
  categories: { 
    icon: Folder, 
    style: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
  },
  authors: { 
    icon: User, 
    style: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
  },
  pricing: { 
    icon: DollarSign, 
    style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
  },
  analytics: { 
    icon: BarChart3, 
    style: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' 
  },
  workflows: { 
    icon: Zap, 
    style: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' 
  },
  users: { 
    icon: Users, 
    style: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' 
  },
  settings: { 
    icon: Settings, 
    style: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' 
  },
};

export function EntityBadge({ entity, className }: EntityBadgeProps) {
  const config = entityConfig[entity] || { 
    icon: Folder, 
    style: 'bg-muted text-muted-foreground' 
  };
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn('border-0 font-medium gap-1', config.style, className)}
    >
      <Icon className="h-3 w-3" />
      {entity}
    </Badge>
  );
}
