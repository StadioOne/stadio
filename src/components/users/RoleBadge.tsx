import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Crown, Shield, Pencil, HeadphonesIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

interface RoleBadgeProps {
  role: AdminRole;
  className?: string;
  showIcon?: boolean;
}

const roleConfig: Record<AdminRole, { icon: React.ComponentType<{ className?: string }>; style: string }> = {
  owner: { 
    icon: Crown, 
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
  },
  admin: { 
    icon: Shield, 
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  editor: { 
    icon: Pencil, 
    style: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
  },
  support: { 
    icon: HeadphonesIcon, 
    style: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' 
  },
};

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn('border-0 font-medium gap-1 text-xs', config.style, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {role}
    </Badge>
  );
}
