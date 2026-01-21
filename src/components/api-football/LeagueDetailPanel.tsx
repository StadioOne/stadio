import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  Calendar,
  CheckCircle2,
  Loader2,
  Download,
  Clock,
  MapPin,
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
}

interface Team {
  id: string;
  external_id: string;
  name: string;
  name_short: string | null;
  logo_url: string | null;
  country: string | null;
  venue_name: string | null;
  venue_city: string | null;
}

interface FixturePreview {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  venue: string | null;
  round: string;
  status: string;
}

interface ImportedEvent {
  id: string;
  external_id: string | null;
  api_title: string | null;
  home_team: string | null;
  away_team: string | null;
  event_date: string;
  status: string;
  is_live: boolean;
}

interface LeagueDetailPanelProps {
  league: League | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchFixturesPreview(
  leagueExternalId: string,
  dateFrom: string,
  dateTo: string
): Promise<FixturePreview[]> {
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
      body: JSON.stringify({
        action: "get_fixtures_preview",
        leagueIds: [parseInt(leagueExternalId)],
        dateFrom,
        dateTo,
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Erreur lors de la récupération des matchs");
  }

  return result.data.fixtures || [];
}

async function importSelectedFixtures(fixtureIds: number[]): Promise<{ created: number; updated: number }> {
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
      body: JSON.stringify({
        action: "import_fixtures",
        fixtureIds,
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Erreur lors de l'importation");
  }

  return result.data;
}

export function LeagueDetailPanel({ league, open, onOpenChange }: LeagueDetailPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  // Fetch teams for this league
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["league-teams", league?.id],
    queryFn: async () => {
      // Teams are fetched from DB - need to find teams that play in this league
      // We can derive this from events that have this league_id
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!league && open,
  });

  // Fetch fixtures preview from API
  const { data: fixturesPreview, isLoading: fixturesLoading, refetch: refetchFixtures } = useQuery({
    queryKey: ["fixtures-preview", league?.external_id, dateFrom, dateTo],
    queryFn: () => fetchFixturesPreview(league!.external_id, dateFrom, dateTo),
    enabled: !!league && open,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch imported events for this league
  const { data: importedEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["league-events", league?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, external_id, api_title, home_team, away_team, event_date, status, is_live")
        .eq("league_id", league!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as ImportedEvent[];
    },
    enabled: !!league && open,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: () => importSelectedFixtures(selectedFixtureIds),
    onSuccess: (data) => {
      toast.success(t("apiFootball.importSuccess", { created: data.created, updated: data.updated }));
      setSelectedFixtureIds([]);
      queryClient.invalidateQueries({ queryKey: ["league-events", league?.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleFixtureSelection = (id: number) => {
    setSelectedFixtureIds((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const selectAllFixtures = () => {
    if (fixturesPreview) {
      setSelectedFixtureIds(fixturesPreview.map((f) => f.id));
    }
  };

  const clearSelection = () => {
    setSelectedFixtureIds([]);
  };

  if (!league) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="flex flex-row items-center gap-4 pb-4">
          {league.logo_url ? (
            <img
              src={league.logo_url}
              alt={league.name}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <SheetTitle>{league.name}</SheetTitle>
            <SheetDescription>
              {league.country} • {t("apiFootball.season")} {league.season}
            </SheetDescription>
          </div>
        </SheetHeader>

        <Tabs defaultValue="fixtures" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fixtures" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("apiFootball.upcomingFixtures")}
            </TabsTrigger>
            <TabsTrigger value="imported" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t("apiFootball.importedEvents")}
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("apiFootball.teams")}
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Fixtures Tab */}
          <TabsContent value="fixtures" className="mt-4 space-y-4">
            {/* Date Range Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("apiFootball.dateFrom")}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("apiFootball.dateTo")}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFixtures}>
                  {t("common.selectAll")}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  {t("common.clear")}
                </Button>
              </div>
              <Button
                size="sm"
                disabled={selectedFixtureIds.length === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                {t("apiFootball.importSelected", { count: selectedFixtureIds.length })}
              </Button>
            </div>

            {/* Fixtures List */}
            <ScrollArea className="h-[400px]">
              {fixturesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : fixturesPreview?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t("apiFootball.noUpcomingFixtures")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fixturesPreview?.map((fixture) => (
                    <div
                      key={fixture.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedFixtureIds.includes(fixture.id)
                          ? "bg-primary/10 border-primary"
                          : "bg-card hover:bg-accent/50"
                      }`}
                      onClick={() => toggleFixtureSelection(fixture.id)}
                    >
                      <Checkbox
                        checked={selectedFixtureIds.includes(fixture.id)}
                        onCheckedChange={() => toggleFixtureSelection(fixture.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={fixture.homeLogo} alt="" className="h-5 w-5 object-contain" />
                          <span className="font-medium text-sm">{fixture.homeTeam}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium text-sm">{fixture.awayTeam}</span>
                          <img src={fixture.awayLogo} alt="" className="h-5 w-5 object-contain" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(fixture.date), "dd MMM HH:mm", { locale: fr })}
                          </span>
                          {fixture.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {fixture.venue}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {fixture.round}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Imported Events Tab */}
          <TabsContent value="imported" className="mt-4">
            <ScrollArea className="h-[450px]">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : importedEvents?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t("apiFootball.noImportedEvents")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importedEvents?.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {event.api_title || `${event.home_team} vs ${event.away_team}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.event_date), "dd MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.is_live && (
                          <Badge variant="destructive" className="animate-pulse">
                            LIVE
                          </Badge>
                        )}
                        <Badge
                          variant={
                            event.status === "published"
                              ? "default"
                              : event.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            <ScrollArea className="h-[450px]">
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : teams?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t("apiFootball.noTeams")}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {teams?.slice(0, 50).map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{team.name}</p>
                        {team.venue_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {team.venue_name}, {team.venue_city}
                          </p>
                        )}
                      </div>
                      {team.country && (
                        <Badge variant="outline" className="text-xs">
                          {team.country}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
