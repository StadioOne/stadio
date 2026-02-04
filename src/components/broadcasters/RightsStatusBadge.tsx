import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type RightsStatus = Database['public']['Enums']['rights_status'];

interface RightsStatusBadgeProps {
  status: RightsStatus;
  className?: string;
}

const statusConfig: Record<RightsStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  active: { label: 'Actif', variant: 'default' },
  expired: { label: 'Expiré', variant: 'outline' },
  revoked: { label: 'Révoqué', variant: 'destructive' },
};

export function RightsStatusBadge({ status, className }: RightsStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
