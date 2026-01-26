import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  RefreshCw, 
  Download, 
  Search, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Calendar,
  Trophy,
  Users,
  LayoutGrid,
  Package
} from "lucide-react";
import { LeagueCard } from "@/components/api-football/LeagueCard";
import { GamesTab } from "./GamesTab";
import { CatalogTab } from "./CatalogTab";

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  icon: string | null;
  api_base_url: string | null;
  is_configured: boolean | null;
}

interface ApiStatus {
  connected: boolean;
  account?: {
    firstname: string;
    lastname: string;
    email: string;
  };
  subscription?: {
    plan: string;
    end: string;
    active: boolean;
  };
  requests?: {
    current: number;
    limit_day: number;
  };
}

interface SportConfigPanelProps {
  sport: Sport;
}

async function callSportSyncEndpoint(body: Record<string, unknown>) {
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
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function SportConfigPanel({ sport }: SportConfigPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("leagues");

  // Fetch API status for this sport
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['api-sport-status', sport.slug],
    queryFn: async () => {
      const result = await callSportSyncEndpoint({
        action: 'check_status',
        sport: sport.slug,
      });
      return result.data?.status as ApiStatus;
    },
  });

  // Fetch leagues for this sport
  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['sport-leagues', sport.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('sport_id', sport.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Sync leagues mutation
  const syncLeaguesMutation = useMutation({
    mutationFn: async () => {
      return callSportSyncEndpoint({
        action: 'sync_leagues',
        sport: sport.slug,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sport-leagues', sport.id] });
      queryClient.invalidateQueries({ queryKey: ['sports'] });
      toast.success(`${result.data?.synced || 0} ligues synchronisées`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de synchronisation');
    },
  });

  // Toggle league sync status
  const toggleLeagueSyncMutation = useMutation({
    mutationFn: async ({ leagueId, isSynced }: { leagueId: string; isSynced: boolean }) => {
      const { error } = await supabase
        .from('leagues')
        .update({ is_synced: isSynced })
        .eq('id', leagueId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-leagues', sport.id] });
    },
  });

  const filteredLeagues = leagues.filter(league =>
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (league.country?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const syncedLeaguesCount = leagues.filter(l => l.is_synced).length;

  return (
    <div className="space-y-6">
      {/* Sport Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{sport.icon || '🏆'}</span>
            <div>
              <CardTitle>{sport.name_fr || sport.name}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {sport.api_base_url}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStatus()}
            disabled={statusLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {statusLoading ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Vérification...
              </Badge>
            ) : statusData?.connected ? (
              <>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connecté
                </Badge>
                {statusData.subscription && (
                  <Badge variant="outline">
                    Plan: {statusData.subscription.plan}
                  </Badge>
                )}
                {statusData.requests && (
                  <Badge variant="outline">
                    {statusData.requests.current.toLocaleString()} / {statusData.requests.limit_day.toLocaleString()} requêtes
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Non connecté
              </Badge>
            )}
            
            <Badge variant="secondary">
              {leagues.length} ligues • {syncedLeaguesCount} suivies
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leagues" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ligues
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Équipes
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Matchs
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Architecture
          </TabsTrigger>
        </TabsList>

        {/* Leagues Tab */}
        <TabsContent value="leagues" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ligue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => syncLeaguesMutation.mutate()}
              disabled={syncLeaguesMutation.isPending || !statusData?.connected}
            >
              {syncLeaguesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Synchroniser toutes les ligues
            </Button>
          </div>

          {leaguesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24">
                    <div className="h-full bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLeagues.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {leagues.length === 0 ? (
                  <>
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune ligue synchronisée</p>
                    <p className="text-sm">Cliquez sur "Synchroniser" pour importer les ligues disponibles</p>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune ligue trouvée pour "{searchQuery}"</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {filteredLeagues.map((league) => (
                  <Card key={league.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {league.logo_url && (
                            <img 
                              src={league.logo_url} 
                              alt={league.name}
                              className="h-10 w-10 object-contain flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{league.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {league.country}
                              {league.season && ` • ${league.season}`}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={league.is_synced ?? false}
                          onCheckedChange={(checked) => 
                            toggleLeagueSyncMutation.mutate({ 
                              leagueId: league.id, 
                              isSynced: checked 
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez d'abord des ligues à suivre</p>
              <p className="text-sm">Les équipes seront automatiquement synchronisées</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games">
          <GamesTab sport={sport} />
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog">
          <CatalogTab sport={sport} />
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture">
          <Card>
            <CardHeader>
              <CardTitle>Architecture API {sport.name}</CardTitle>
              <CardDescription>
                Structure des endpoints disponibles pour ce sport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <div className="font-mono text-sm text-primary">/status</div>
                      <div className="text-xs text-muted-foreground mt-1">État de l'API</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <div className="font-mono text-sm text-primary">/leagues</div>
                      <div className="text-xs text-muted-foreground mt-1">Compétitions</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <div className="font-mono text-sm text-primary">/teams</div>
                      <div className="text-xs text-muted-foreground mt-1">Équipes</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <div className="font-mono text-sm text-primary">
                        {sport.slug === 'football' ? '/fixtures' : '/games'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Matchs</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Base URL: <code className="bg-muted px-2 py-1 rounded">{sport.api_base_url}</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
