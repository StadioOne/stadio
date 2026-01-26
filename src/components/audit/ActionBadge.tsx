import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActionBadgeProps {
  action: string;
  className?: string;
}

const actionStyles: Record<string, string> = {
  publish: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  unpublish: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  update: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  trigger: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  import: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  sync: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const style = actionStyles[action] || 'bg-muted text-muted-foreground';
  
  return (
    <Badge 
      variant="outline" 
      className={cn('border-0 font-medium', style, className)}
    >
      {action}
    </Badge>
  );
}
