import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Download,
  Loader2,
  Search,
  Trophy,
} from "lucide-react";

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
}

interface League {
  id: string;
  external_id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  season: number | null;
}

interface Game {
  id: number;
  date: string;
  status: string;
  statusLong: string;
  venue: string | null;
  homeTeam: {
    id: number;
    name: string;
    logo: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    logo: string | null;
  };
  homeScore: number | null;
  awayScore: number | null;
  league: {
    id: number;
    name: string;
    logo: string | null;
    round?: string;
  };
}

interface GamesTabProps {
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

export function GamesTab({ sport }: GamesTabProps) {
  const queryClient = useQueryClient();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(addDays(new Date(), 7));
  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set());

  // Fetch leagues for this sport
  const { data: leagues = [] } = useQuery({
    queryKey: ['sport-leagues', sport.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('sport_id', sport.id)
        .eq('is_synced', true)
        .order('name');
      
      if (error) throw error;
      return data as League[];
    },
  });

  // Fetch games preview when league is selected
  const { data: gamesData, isLoading: gamesLoading, refetch: refetchGames } = useQuery({
    queryKey: ['games-preview', sport.slug, selectedLeagueId, dateFrom, dateTo],
    queryFn: async () => {
      const league = leagues.find(l => l.id === selectedLeagueId);
      if (!league) return { games: [], errors: [] };

      const result = await callSportSyncEndpoint({
        action: 'get_games_preview',
        sport: sport.slug,
        leagueIds: [parseInt(league.external_id)],
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        season: league.season,
      });

      return result.data as { games: Game[]; errors: string[] };
    },
    enabled: !!selectedLeagueId && leagues.length > 0,
  });

  // Import games mutation
  const importGamesMutation = useMutation({
    mutationFn: async (gameIds: number[]) => {
      const league = leagues.find(l => l.id === selectedLeagueId);
      if (!league) throw new Error('League not found');

      return callSportSyncEndpoint({
        action: 'import_games',
        sport: sport.slug,
        leagueIds: [parseInt(league.external_id)],
        gameIds,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        season: league.season,
      });
    },
    onSuccess: (result) => {
      const { created, updated } = result.data || { created: 0, updated: 0 };
      toast.success(`${created} créé(s), ${updated} mis à jour dans le catalogue`);
      setSelectedGames(new Set());
      queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur d\'import');
    },
  });

  const games = gamesData?.games || [];
  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);

  const toggleGame = (gameId: number) => {
    const newSet = new Set(selectedGames);
    if (newSet.has(gameId)) {
      newSet.delete(gameId);
    } else {
      newSet.add(gameId);
    }
    setSelectedGames(newSet);
  };

  const toggleAllGames = () => {
    if (selectedGames.size === games.length) {
      setSelectedGames(new Set());
    } else {
      setSelectedGames(new Set(games.map(g => g.id)));
    }
  };

  const handleImport = () => {
    if (selectedGames.size === 0) return;
    importGamesMutation.mutate(Array.from(selectedGames));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* League selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Ligue</label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une ligue" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      <div className="flex items-center gap-2">
                        {league.logo_url && (
                          <img src={league.logo_url} alt="" className="h-4 w-4 object-contain" />
                        )}
                        {league.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-sm font-medium mb-2 block">Du</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <label className="text-sm font-medium mb-2 block">Au</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search button */}
            <Button
              onClick={() => refetchGames()}
              disabled={!selectedLeagueId || gamesLoading}
            >
              {gamesLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Games list */}
      {!selectedLeagueId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une ligue pour prévisualiser les matchs disponibles</p>
            <p className="text-sm mt-2">Seules les ligues suivies sont disponibles</p>
          </CardContent>
        </Card>
      ) : gamesLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Chargement des matchs...</p>
          </CardContent>
        </Card>
      ) : games.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun match trouvé pour cette période</p>
            <p className="text-sm mt-2">Essayez d'élargir la plage de dates</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selection header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedGames.size === games.length && games.length > 0}
                onCheckedChange={toggleAllGames}
              />
              <span className="text-sm text-muted-foreground">
                {selectedGames.size} / {games.length} sélectionné(s)
              </span>
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedGames.size === 0 || importGamesMutation.isPending}
            >
              {importGamesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Importer dans le catalogue ({selectedGames.size})
            </Button>
          </div>

          {/* Games scroll area */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {games.map((game) => (
                <Card
                  key={game.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedGames.has(game.id) && "border-primary bg-primary/5"
                  )}
                  onClick={() => toggleGame(game.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedGames.has(game.id)}
                        onCheckedChange={() => toggleGame(game.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Teams */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {game.homeTeam.logo && (
                            <img
                              src={game.homeTeam.logo}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="font-medium truncate">
                            {game.homeTeam.name}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          {game.awayTeam.logo && (
                            <img
                              src={game.awayTeam.logo}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="font-medium truncate">
                            {game.awayTeam.name}
                          </span>
                        </div>
                        {game.league?.round && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {game.league.round}
                          </div>
                        )}
                      </div>

                      {/* Date & Status */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium">
                          {format(new Date(game.date), "dd MMM yyyy", { locale: fr })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(game.date), "HH:mm")}
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge variant="outline" className="flex-shrink-0">
                        {game.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
