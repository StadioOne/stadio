import { FileText, CheckCircle, FileEdit, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RightsStats {
  total: number;
  active: number;
  draft: number;
  exclusive: number;
}

interface RightsStatsCardsProps {
  stats: RightsStats | undefined;
  isLoading: boolean;
}

export function RightsStatsCards({ stats, isLoading }: RightsStatsCardsProps) {
  const cards = [
    { 
      label: 'Total droits', 
      value: stats?.total ?? 0, 
      icon: FileText,
      color: 'text-muted-foreground' 
    },
    { 
      label: 'Actifs', 
      value: stats?.active ?? 0, 
      icon: CheckCircle,
      color: 'text-green-600' 
    },
    { 
      label: 'Brouillons', 
      value: stats?.draft ?? 0, 
      icon: FileEdit,
      color: 'text-amber-600' 
    },
    { 
      label: 'Exclusifs', 
      value: stats?.exclusive ?? 0, 
      icon: Lock,
      color: 'text-blue-600' 
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div 
          key={label} 
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-8" />
            ) : (
              <p className="text-xl font-semibold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
