import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Calendar, 
  Users, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  Settings2,
  Database
} from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface League {
  id: string;
  external_id: string;
  name: string;
  name_fr: string | null;
  country: string | null;
  country_code: string | null;
  logo_url: string | null;
  type: string | null;
  season: number | null;
  is_active: boolean;
  is_synced: boolean;
  updated_at: string;
}

interface SyncResult {
  action: string;
  synced?: number;
  created?: number;
  updated?: number;
  errors?: string[];
  leagues?: { synced: number; errors: string[] };
  teams?: { synced: number; errors: string[] };
  fixtures?: { synced: number; created: number; updated: number; errors: string[] };
}

// Popular leagues for quick selection
const POPULAR_LEAGUES = [
  { id: 39, name: "Premier League", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 2, name: "UEFA Champions League", country: "World" },
  { id: 3, name: "UEFA Europa League", country: "World" },
  { id: 848, name: "UEFA Conference League", country: "World" },
];

async function callSyncEndpoint(body: Record<string, unknown>): Promise<SyncResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Non authentifié");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-football-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Erreur de synchronisation");
  }

  return result.data;
}

export default function ApiFootballSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);

  // Fetch existing synced leagues
  const { data: leagues, isLoading: leaguesLoading } = useQuery({
    queryKey: ["leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as League[];
    },
  });

  // Fetch recent workflow runs
  const { data: recentRuns } = useQuery({
    queryKey: ["workflow-runs", "api-football"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*")
        .ilike("workflow_name", "%api_football%")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Sync mutations
  const syncLeaguesMutation = useMutation({
    mutationFn: () => callSyncEndpoint({ action: "sync_leagues" }),
    onSuccess: (data) => {
      toast.success(t("apiFootball.syncSuccess", { count: data.synced }));
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncTeamsMutation = useMutation({
    mutationFn: () => callSyncEndpoint({ 
      action: "sync_teams",
      leagueIds: selectedLeagueIds.length > 0 ? selectedLeagueIds : undefined,
    }),
    onSuccess: (data) => {
      toast.success(t("apiFootball.syncSuccess", { count: data.synced }));
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncFixturesMutation = useMutation({
    mutationFn: () => callSyncEndpoint({ 
      action: "sync_fixtures",
      leagueIds: selectedLeagueIds.length > 0 ? selectedLeagueIds : undefined,
      dateFrom,
      dateTo,
    }),
    onSuccess: (data) => {
      toast.success(
        t("apiFootball.fixturesSyncSuccess", { 
          created: data.created, 
          updated: data.updated 
        })
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => callSyncEndpoint({ 
      action: "sync_all",
      leagueIds: selectedLeagueIds.length > 0 ? selectedLeagueIds : undefined,
      dateFrom,
      dateTo,
    }),
    onSuccess: (data) => {
      const total = (data.leagues?.synced || 0) + 
                   (data.teams?.synced || 0) + 
                   (data.fixtures?.synced || 0);
      toast.success(t("apiFootball.syncAllSuccess", { count: total }));
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle league sync status
  const toggleLeagueSyncMutation = useMutation({
    mutationFn: async ({ id, isSynced }: { id: string; isSynced: boolean }) => {
      const { error } = await supabase
        .from("leagues")
        .update({ is_synced: isSynced })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
  });

  const isSyncing = 
    syncLeaguesMutation.isPending || 
    syncTeamsMutation.isPending || 
    syncFixturesMutation.isPending ||
    syncAllMutation.isPending;

  const syncedLeaguesCount = leagues?.filter((l) => l.is_synced).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("apiFootball.title")}</h1>
        <p className="text-muted-foreground">
          {t("apiFootball.description")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("apiFootball.syncedLeagues")}
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncedLeaguesCount}</div>
            <p className="text-xs text-muted-foreground">
              {t("apiFootball.activeLeagues")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("apiFootball.totalLeagues")}
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leagues?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("apiFootball.inDatabase")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("apiFootball.dateRange")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              {t("apiFootball.daysAhead")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("apiFootball.lastSync")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {recentRuns?.[0] 
                ? format(new Date(recentRuns[0].created_at), "dd/MM HH:mm", { locale: fr })
                : "-"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {recentRuns?.[0]?.status === "success" 
                ? t("apiFootball.success") 
                : recentRuns?.[0]?.status === "failed"
                ? t("apiFootball.failed")
                : t("apiFootball.noRecentSync")
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t("apiFootball.syncActions")}
          </CardTitle>
          <CardDescription>
            {t("apiFootball.syncActionsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("apiFootball.dateFrom")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("apiFootball.dateTo")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Quick League Selection */}
          <div className="space-y-2">
            <Label>{t("apiFootball.quickSelect")}</Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_LEAGUES.map((league) => (
                <Badge
                  key={league.id}
                  variant={selectedLeagueIds.includes(league.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedLeagueIds((prev) =>
                      prev.includes(league.id)
                        ? prev.filter((id) => id !== league.id)
                        : [...prev, league.id]
                    );
                  }}
                >
                  {league.name}
                </Badge>
              ))}
              {selectedLeagueIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSelectedLeagueIds([])}
                >
                  {t("common.clear")}
                </Badge>
              )}
            </div>
          </div>

          {/* Sync Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => syncLeaguesMutation.mutate()}
              disabled={isSyncing}
            >
              {syncLeaguesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Trophy className="mr-2 h-4 w-4" />
              {t("apiFootball.syncLeagues")}
            </Button>

            <Button
              variant="outline"
              onClick={() => syncTeamsMutation.mutate()}
              disabled={isSyncing}
            >
              {syncTeamsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Users className="mr-2 h-4 w-4" />
              {t("apiFootball.syncTeams")}
            </Button>

            <Button
              variant="outline"
              onClick={() => syncFixturesMutation.mutate()}
              disabled={isSyncing}
            >
              {syncFixturesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Calendar className="mr-2 h-4 w-4" />
              {t("apiFootball.syncFixtures")}
            </Button>

            <Button
              onClick={() => syncAllMutation.mutate()}
              disabled={isSyncing}
            >
              {syncAllMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("apiFootball.syncAll")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Synced Leagues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("apiFootball.configuredLeagues")}
          </CardTitle>
          <CardDescription>
            {t("apiFootball.configuredLeaguesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaguesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leagues?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t("apiFootball.noLeagues")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => syncLeaguesMutation.mutate()}
                disabled={isSyncing}
              >
                {t("apiFootball.importLeagues")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {leagues?.map((league) => (
                <div
                  key={league.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={league.is_synced}
                    onCheckedChange={(checked) => {
                      toggleLeagueSyncMutation.mutate({
                        id: league.id,
                        isSynced: !!checked,
                      });
                    }}
                  />
                  {league.logo_url && (
                    <img
                      src={league.logo_url}
                      alt={league.name}
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{league.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {league.country} • {league.season}
                    </p>
                  </div>
                  {league.is_synced ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      {recentRuns && recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("apiFootball.recentSyncs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {run.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : run.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{run.workflow_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(run.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  {run.duration_ms && (
                    <Badge variant="outline">
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
