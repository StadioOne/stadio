import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Server, Shield, BarChart3, Clock, CheckCircle2, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EdgeFunction {
  name: string;
  description: string;
  category: 'admin' | 'public' | 'system';
  endpoint: string;
  authRequired: boolean;
}

// Liste des Edge Functions du projet
const EDGE_FUNCTIONS: EdgeFunction[] = [
  {
    name: 'admin-dashboard',
    description: 'Récupère les statistiques du tableau de bord (événements, originals, utilisateurs)',
    category: 'admin',
    endpoint: '/functions/v1/admin-dashboard',
    authRequired: true,
  },
  {
    name: 'admin-events-publish',
    description: 'Publie un événement et le rend visible aux utilisateurs finaux',
    category: 'admin',
    endpoint: '/functions/v1/admin-events-publish',
    authRequired: true,
  },
  {
    name: 'admin-events-unpublish',
    description: 'Dépublie un événement et le retire de la vue publique',
    category: 'admin',
    endpoint: '/functions/v1/admin-events-unpublish',
    authRequired: true,
  },
  {
    name: 'admin-originals-publish',
    description: 'Publie un contenu Original (article, podcast, émission)',
    category: 'admin',
    endpoint: '/functions/v1/admin-originals-publish',
    authRequired: true,
  },
  {
    name: 'admin-originals-unpublish',
    description: 'Dépublie un contenu Original',
    category: 'admin',
    endpoint: '/functions/v1/admin-originals-unpublish',
    authRequired: true,
  },
  {
    name: 'admin-pricing-recompute',
    description: 'Recalcule les prix de tous les événements selon les règles de tarification',
    category: 'admin',
    endpoint: '/functions/v1/admin-pricing-recompute',
    authRequired: true,
  },
  {
    name: 'admin-lists-rebuild',
    description: 'Reconstruit les listes éditoriales et les catégories automatiques',
    category: 'admin',
    endpoint: '/functions/v1/admin-lists-rebuild',
    authRequired: true,
  },
  {
    name: 'admin-n8n-trigger',
    description: 'Déclenche un workflow n8n via webhook sécurisé',
    category: 'admin',
    endpoint: '/functions/v1/admin-n8n-trigger',
    authRequired: true,
  },
  {
    name: 'admin-audit-log',
    description: 'Récupère les entrées du journal d\'audit avec filtres et pagination',
    category: 'admin',
    endpoint: '/functions/v1/admin-audit-log',
    authRequired: true,
  },
  {
    name: 'admin-analytics-overview',
    description: 'Fournit les KPIs globaux de la plateforme (vues, achats, revenus)',
    category: 'admin',
    endpoint: '/functions/v1/admin-analytics-overview',
    authRequired: true,
  },
  {
    name: 'admin-analytics-fixtures',
    description: 'Analyse détaillée des performances des événements sportifs',
    category: 'admin',
    endpoint: '/functions/v1/admin-analytics-fixtures',
    authRequired: true,
  },
  {
    name: 'admin-analytics-originals',
    description: 'Analyse détaillée des performances des contenus Originals',
    category: 'admin',
    endpoint: '/functions/v1/admin-analytics-originals',
    authRequired: true,
  },
  {
    name: 'admin-analytics-geo',
    description: 'Répartition géographique de l\'audience par pays',
    category: 'admin',
    endpoint: '/functions/v1/admin-analytics-geo',
    authRequired: true,
  },
  {
    name: 'admin-analytics-aggregate',
    description: 'Agrège les événements analytics bruts en données quotidiennes',
    category: 'system',
    endpoint: '/functions/v1/admin-analytics-aggregate',
    authRequired: true,
  },
  {
    name: 'admin-analytics-cleanup',
    description: 'Nettoie les données analytics brutes de plus de 90 jours',
    category: 'system',
    endpoint: '/functions/v1/admin-analytics-cleanup',
    authRequired: true,
  },
  {
    name: 'admin-api-football-sync',
    description: 'Synchronise les données des compétitions et matchs depuis API-Football',
    category: 'admin',
    endpoint: '/functions/v1/admin-api-football-sync',
    authRequired: true,
  },
  {
    name: 'admin-api-sports-sync',
    description: 'Synchronise les données depuis les différentes APIs sportives',
    category: 'admin',
    endpoint: '/functions/v1/admin-api-sports-sync',
    authRequired: true,
  },
  {
    name: 'public-analytics-ingest',
    description: 'Ingestion publique des événements analytics (vues, likes, achats)',
    category: 'public',
    endpoint: '/functions/v1/public-analytics-ingest',
    authRequired: false,
  },
];

function useEdgeFunctionStats() {
  return useQuery({
    queryKey: ['edge-function-stats'],
    queryFn: async () => {
      // Récupérer les stats des 7 derniers jours depuis audit_log
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data: auditData, error } = await supabase
        .from('audit_log')
        .select('entity, action, created_at')
        .gte('created_at', sevenDaysAgo);

      if (error) throw error;

      // Compter les appels par entité/action
      const stats: Record<string, number> = {};
      auditData?.forEach(log => {
        const key = `${log.entity}-${log.action}`;
        stats[key] = (stats[key] || 0) + 1;
      });

      // Mapper vers les edge functions
      const functionStats: Record<string, number> = {
        'admin-events-publish': stats['events-publish'] || 0,
        'admin-events-unpublish': stats['events-unpublish'] || 0,
        'admin-originals-publish': stats['originals-publish'] || 0,
        'admin-originals-unpublish': stats['originals-unpublish'] || 0,
        'admin-pricing-recompute': stats['events-pricing_recompute'] || 0,
        'admin-n8n-trigger': stats['workflow-trigger'] || 0,
      };

      // Total des entrées audit
      const totalAuditEntries = auditData?.length || 0;

      return {
        functionStats,
        totalAuditEntries,
        lastUpdated: new Date(),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function getCategoryBadge(category: EdgeFunction['category']) {
  switch (category) {
    case 'admin':
      return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Admin</Badge>;
    case 'public':
      return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Public</Badge>;
    case 'system':
      return <Badge variant="default" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Système</Badge>;
  }
}

function EdgeFunctionCard({ fn, callCount }: { fn: EdgeFunction; callCount?: number }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-mono">{fn.name}</CardTitle>
            </div>
          </div>
          {getCategoryBadge(fn.category)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="text-sm">{fn.description}</CardDescription>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {fn.authRequired ? (
              <>
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <span>Auth requise</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>Public</span>
              </>
            )}
          </div>
          
          {callCount !== undefined && callCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>{callCount} appels (7j)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: typeof Server;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function EdgeFunctionsPage() {
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useEdgeFunctionStats();

  const adminFunctions = EDGE_FUNCTIONS.filter(fn => fn.category === 'admin');
  const publicFunctions = EDGE_FUNCTIONS.filter(fn => fn.category === 'public');
  const systemFunctions = EDGE_FUNCTIONS.filter(fn => fn.category === 'system');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Server className="h-8 w-8" />
            Edge Functions
          </h1>
          <p className="text-muted-foreground mt-1">
            {EDGE_FUNCTIONS.length} fonctions backend intégrées à la plateforme
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Functions"
          value={EDGE_FUNCTIONS.length}
          description="Fonctions déployées"
          icon={Server}
        />
        <StatsCard
          title="Admin"
          value={adminFunctions.length}
          description="Actions administratives"
          icon={Shield}
        />
        <StatsCard
          title="Activité (7j)"
          value={statsLoading ? '...' : stats?.totalAuditEntries || 0}
          description="Entrées audit log"
          icon={BarChart3}
        />
        <StatsCard
          title="Dernière MAJ"
          value={statsLoading ? '...' : stats?.lastUpdated ? format(stats.lastUpdated, 'HH:mm', { locale: fr }) : '-'}
          description={statsLoading ? 'Chargement...' : stats?.lastUpdated ? format(stats.lastUpdated, 'dd MMM yyyy', { locale: fr }) : '-'}
          icon={Clock}
        />
      </div>

      {/* Admin Functions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Fonctions Administration ({adminFunctions.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminFunctions.map(fn => (
            <EdgeFunctionCard 
              key={fn.name} 
              fn={fn} 
              callCount={stats?.functionStats[fn.name]}
            />
          ))}
        </div>
      </div>

      {/* System Functions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Fonctions Système ({systemFunctions.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemFunctions.map(fn => (
            <EdgeFunctionCard 
              key={fn.name} 
              fn={fn}
              callCount={stats?.functionStats[fn.name]}
            />
          ))}
        </div>
      </div>

      {/* Public Functions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Fonctions Publiques ({publicFunctions.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicFunctions.map(fn => (
            <EdgeFunctionCard 
              key={fn.name} 
              fn={fn}
              callCount={stats?.functionStats[fn.name]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
