import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Zap,
  Calendar as CalendarIcon,
  ChevronRight,
  Trophy,
  Package,
  ArrowRight,
} from "lucide-react";

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  icon: string | null;
  api_base_url: string | null;
  is_configured: boolean | null;
  is_active: boolean | null;
}

interface League {
  id: string;
  external_id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  season: number | null;
  is_synced: boolean | null;
}

interface Game {
  id: number;
  date: string;
  status: string;
  homeTeam: { id: number; name: string; logo: string | null };
  awayTeam: { id: number; name: string; logo: string | null };
  league: { id: number; name: string; round?: string };
}

async function callSportSyncEndpoint(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Non authentifié');
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
    const error = await response.json().catch(() => ({ error: 'Erreur de requête' }));
    throw new Error(error.error || 'Erreur de requête');
  }

  return response.json();
}

export default function ApiSportsSettingsPage() {
  const queryClient = useQueryClient();
  
  // Step 1: Sport selection
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  
  // Step 2: League + Date selection
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(addDays(new Date(), 7));
  
  // Step 3: Games selection
  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set());
  const [quickDateRange, setQuickDateRange] = useState<string>("7d");

  // Fetch all sports
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['sports-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .eq('api_provider', 'api-sports')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Sport[];
    },
  });

  // Fetch leagues for selected sport
  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['sport-leagues-synced', selectedSport?.id],
    queryFn: async () => {
      if (!selectedSport) return [];
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('sport_id', selectedSport.id)
        .eq('is_synced', true)
        .order('name');
      if (error) throw error;
      return data as League[];
    },
    enabled: !!selectedSport,
  });

  // Fetch games preview
  const { data: gamesData, isLoading: gamesLoading, refetch: refetchGames } = useQuery({
    queryKey: ['games-preview', selectedSport?.slug, selectedLeagueId, dateFrom, dateTo],
    queryFn: async () => {
      const league = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedSport || !league) return { games: [], errors: [] };

      const result = await callSportSyncEndpoint({
        action: 'get_games_preview',
        sport: selectedSport.slug,
        leagueIds: [parseInt(league.external_id)],
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        season: league.season,
      });

      return result.data as { games: Game[]; errors: string[] };
    },
    enabled: !!selectedSport && !!selectedLeagueId && leagues.length > 0,
  });

  // Import games mutation
  const importGamesMutation = useMutation({
    mutationFn: async (gameIds: number[]) => {
      const league = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedSport || !league) throw new Error('Sport ou ligue non sélectionnée');

      return callSportSyncEndpoint({
        action: 'import_games',
        sport: selectedSport.slug,
        leagueIds: [parseInt(league.external_id)],
        gameIds,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        season: league.season,
      });
    },
    onSuccess: (result) => {
      const { created, updated } = result.data || { created: 0, updated: 0 };
      toast.success(`${created + updated} événement(s) importé(s) dans le catalogue`);
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

  const handleQuickDateRange = (range: string) => {
    setQuickDateRange(range);
    const now = new Date();
    setDateFrom(now);
    switch (range) {
      case "7d": setDateTo(addDays(now, 7)); break;
      case "14d": setDateTo(addDays(now, 14)); break;
      case "30d": setDateTo(addDays(now, 30)); break;
      case "3m": setDateTo(addMonths(now, 3)); break;
      case "6m": setDateTo(addMonths(now, 6)); break;
    }
  };

  const handleSelectSport = (sport: Sport) => {
    setSelectedSport(sport);
    setSelectedLeagueId("");
    setSelectedGames(new Set());
  };

  const stepNumber = !selectedSport ? 1 : !selectedLeagueId ? 2 : 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Zap className="h-7 w-7" />
          Import depuis API Sports
        </h1>
        <p className="text-muted-foreground">
          Importez des matchs pour les ajouter au catalogue et les proposer à la vente
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={stepNumber >= 1 ? "default" : "outline"} className="rounded-full">1</Badge>
        <span className={stepNumber >= 1 ? "font-medium" : "text-muted-foreground"}>Sport</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={stepNumber >= 2 ? "default" : "outline"} className="rounded-full">2</Badge>
        <span className={stepNumber >= 2 ? "font-medium" : "text-muted-foreground"}>Ligue & Période</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={stepNumber >= 3 ? "default" : "outline"} className="rounded-full">3</Badge>
        <span className={stepNumber >= 3 ? "font-medium" : "text-muted-foreground"}>Matchs</span>
      </div>

      {/* Step 1: Sport Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sélectionnez un sport</CardTitle>
        </CardHeader>
        <CardContent>
          {sportsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <Button
                  key={sport.id}
                  variant={selectedSport?.id === sport.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectSport(sport)}
                  className="gap-2"
                >
                  <span className="text-lg">{sport.icon || '🏆'}</span>
                  {sport.name_fr || sport.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: League + Date Selection */}
      {selectedSport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ligue et période
            </CardTitle>
            <CardDescription>
              Sélectionnez une ligue suivie et la période à explorer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaguesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leagues.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune ligue suivie pour ce sport</p>
                <p className="text-sm mt-1">Synchronisez d'abord les ligues depuis les paramètres avancés</p>
              </div>
            ) : (
              <>
                {/* League selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Ligue</label>
                  <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                    <SelectTrigger className="w-full max-w-md">
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
                            {league.country && <span className="text-muted-foreground">({league.country})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "7d", label: "7 jours" },
                      { value: "14d", label: "14 jours" },
                      { value: "30d", label: "1 mois" },
                      { value: "3m", label: "3 mois" },
                      { value: "6m", label: "6 mois" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={quickDateRange === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleQuickDateRange(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[130px] justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateFrom, "dd/MM/yy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={(date) => date && setDateFrom(date)}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[130px] justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateTo, "dd/MM/yy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(date) => date && setDateTo(date)}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Search button */}
                {selectedLeagueId && (
                  <Button onClick={() => refetchGames()} disabled={gamesLoading}>
                    {gamesLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Rechercher les matchs
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Games List */}
      {selectedSport && selectedLeagueId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Matchs disponibles
                </CardTitle>
                <CardDescription>
                  {selectedLeague?.name} • {format(dateFrom, "dd MMM")} - {format(dateTo, "dd MMM yyyy")}
                </CardDescription>
              </div>
              {games.length > 0 && (
                <Button
                  onClick={handleImport}
                  disabled={selectedGames.size === 0 || importGamesMutation.isPending}
                >
                  {importGamesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Importer {selectedGames.size > 0 && `(${selectedGames.size})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun match trouvé pour cette période</p>
                <p className="text-sm mt-1">Essayez d'élargir la plage de dates</p>
              </div>
            ) : (
              <>
                {/* Selection header */}
                <div className="flex items-center gap-4 mb-4 pb-3 border-b">
                  <Checkbox
                    checked={selectedGames.size === games.length && games.length > 0}
                    onCheckedChange={toggleAllGames}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedGames.size} / {games.length} sélectionné(s)
                  </span>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {games.map((game) => (
                      <div
                        key={game.id}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedGames.has(game.id) && "border-primary bg-primary/5"
                        )}
                        onClick={() => toggleGame(game.id)}
                      >
                        <Checkbox
                          checked={selectedGames.has(game.id)}
                          onCheckedChange={() => toggleGame(game.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* Teams */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {game.homeTeam.logo && (
                              <img src={game.homeTeam.logo} alt="" className="h-5 w-5 object-contain" />
                            )}
                            <span className="font-medium">{game.homeTeam.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            {game.awayTeam.logo && (
                              <img src={game.awayTeam.logo} alt="" className="h-5 w-5 object-contain" />
                            )}
                            <span className="font-medium">{game.awayTeam.name}</span>
                          </div>
                          {game.league?.round && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {game.league.round}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium">
                            {format(new Date(game.date), "dd MMM", { locale: fr })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(game.date), "HH:mm")}
                          </div>
                        </div>

                        <Badge variant="outline">{game.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
