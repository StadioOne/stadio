import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { SportSelector } from "@/components/api-sports/SportSelector";
import { SportConfigPanel } from "@/components/api-sports/SportConfigPanel";

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  icon: string | null;
  api_base_url: string | null;
  is_configured: boolean | null;
  is_active: boolean | null;
  display_order?: number | null;
  leaguesCount?: number;
}

interface ConnectivityResult {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

async function testAllSportsConnectivity(): Promise<Record<string, ConnectivityResult>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-sports-sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'test_all_sports' }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to test connectivity');
  }

  const result = await response.json();
  return result.data?.results || {};
}

export default function ApiSportsSettingsPage() {
  const { t } = useTranslation();
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  
  const handleSelectSport = (sport: Sport) => {
    setSelectedSport(sport);
  };
  const [connectivityResults, setConnectivityResults] = useState<Record<string, ConnectivityResult>>({});
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);

  // Fetch all sports with league counts
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['sports-with-counts'],
    queryFn: async () => {
      // Fetch sports
      const { data: sportsData, error: sportsError } = await supabase
        .from('sports')
        .select('*')
        .eq('api_provider', 'api-sports')
        .order('display_order');
      
      if (sportsError) throw sportsError;

      // Fetch league counts per sport
      const { data: leagueCounts, error: countError } = await supabase
        .from('leagues')
        .select('sport_id');
      
      if (countError) throw countError;

      // Count leagues per sport
      const countMap = leagueCounts?.reduce((acc, league) => {
        if (league.sport_id) {
          acc[league.sport_id] = (acc[league.sport_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      return (sportsData || []).map(sport => ({
        ...sport,
        leaguesCount: countMap[sport.id] || 0,
      })) as Sport[];
    },
  });

  const handleTestConnectivity = async () => {
    setIsTestingConnectivity(true);
    try {
      const results = await testAllSportsConnectivity();
      setConnectivityResults(results);
      
      const connectedCount = Object.values(results).filter(r => r.connected).length;
      toast.success(`${connectedCount}/${Object.keys(results).length} APIs connectées`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de test');
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  const configuredSportsCount = sports.filter(s => s.is_configured).length;
  const totalLeagues = sports.reduce((sum, s) => sum + (s.leaguesCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('apiSports.title', 'Configuration API Sports')}
          </h1>
          <p className="text-muted-foreground">
            {t('apiSports.description', 'Gérez les connexions aux APIs sportives et synchronisez les données')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleTestConnectivity}
          disabled={isTestingConnectivity}
        >
          {isTestingConnectivity ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Tester toutes les APIs
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{sports.length}</div>
            <div className="text-sm text-muted-foreground">Sports disponibles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{configuredSportsCount}</div>
            <div className="text-sm text-muted-foreground">Sports configurés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalLeagues}</div>
            <div className="text-sm text-muted-foreground">Ligues totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {Object.keys(connectivityResults).length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {Object.values(connectivityResults).filter(r => r.connected).length}
                  </div>
                  <span className="text-muted-foreground">/ {Object.keys(connectivityResults).length}</span>
                </>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">—</div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">APIs connectées</div>
          </CardContent>
        </Card>
      </div>

      {/* Connectivity Results */}
      {Object.keys(connectivityResults).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Résultats du test de connectivité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(connectivityResults).map(([slug, result]) => {
                const sport = sports.find(s => s.slug === slug);
                return (
                  <Badge
                    key={slug}
                    variant={result.connected ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {result.connected ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {sport?.icon} {sport?.name || slug}
                    <span className="text-xs opacity-70">({result.latencyMs}ms)</span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Sport Selector */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Sélectionnez un sport</h2>
        <SportSelector
          sports={sports}
          selectedSport={selectedSport}
          onSelectSport={handleSelectSport}
          isLoading={sportsLoading}
        />
      </div>

      {/* Sport Configuration Panel */}
      {selectedSport && (
        <>
          <Separator />
          <SportConfigPanel sport={selectedSport} />
        </>
      )}
    </div>
  );
}
