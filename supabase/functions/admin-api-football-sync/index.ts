// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateAdmin, isAuthError } from "../_shared/auth.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

interface SyncRequest {
  action: "sync_leagues" | "sync_fixtures" | "sync_teams" | "sync_all" | "check_status" | "get_fixtures_preview" | "import_fixtures";
  leagueIds?: number[];
  fixtureIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  season?: number;
}

interface ApiFootballLeague {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string;
    flag: string;
  };
  seasons: Array<{
    year: number;
    current: boolean;
  }>;
}

interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    logo: string;
  };
  venue: {
    name: string;
    city: string;
  };
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    venue: {
      name: string;
      city: string;
    };
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    round: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface LeagueRow {
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

interface TeamRow {
  id: string;
  external_id: string;
  name: string;
  name_short: string | null;
  logo_url: string | null;
  country: string | null;
}

interface EventRow {
  id: string;
  external_id: string | null;
  status: string;
}

interface TeamData {
  external_id: string;
  name: string;
  name_short: string | null;
  logo_url: string | null;
  country: string | null;
  venue_name: string | null;
  venue_city: string | null;
  is_active: boolean;
  updated_at: string;
}

async function fetchFromApiFootball<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T[]> {
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY not configured");
  }

  const url = new URL(`${API_FOOTBALL_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API-Football error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response || [];
}

async function syncLeagues(
  supabase: any,
  leagueIds?: number[]
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // Fetch leagues from API-Football
    const leagues = await fetchFromApiFootball<ApiFootballLeague>("/leagues");

    // Filter by specific IDs if provided
    const filteredLeagues = leagueIds?.length
      ? leagues.filter((l) => leagueIds.includes(l.league.id))
      : leagues;

    // Prepare upsert data
    const leagueData = filteredLeagues.map((l) => {
      const currentSeason = l.seasons.find((s) => s.current);
      return {
        external_id: String(l.league.id),
        name: l.league.name,
        country: l.country.name,
        country_code: l.country.code,
        logo_url: l.league.logo,
        type: l.league.type,
        season: currentSeason?.year || new Date().getFullYear(),
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert in batches
    const batchSize = 50;
    for (let i = 0; i < leagueData.length; i += batchSize) {
      const batch = leagueData.slice(i, i + batchSize);
      const { error } = await supabase
        .from("leagues")
        .upsert(batch as unknown[], { onConflict: "external_id" });

      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        synced += batch.length;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { synced, errors };
}

async function syncTeams(
  supabase: any,
  leagueIds: number[]
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  const allTeams = new Map<string, TeamData>();

  // Fetch teams for each league
  for (const leagueId of leagueIds) {
    try {
      const teams = await fetchFromApiFootball<ApiFootballTeam>("/teams", {
        league: leagueId,
        season: new Date().getFullYear(),
      });

      for (const t of teams) {
        const teamData: TeamData = {
          external_id: String(t.team.id),
          name: t.team.name,
          name_short: t.team.code,
          logo_url: t.team.logo,
          country: t.team.country,
          venue_name: t.venue?.name || null,
          venue_city: t.venue?.city || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        allTeams.set(teamData.external_id, teamData);
      }

      // Rate limiting - wait between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      errors.push(
        `League ${leagueId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Upsert all teams
  const teamDataArray = Array.from(allTeams.values());
  const batchSize = 50;
  for (let i = 0; i < teamDataArray.length; i += batchSize) {
    const batch = teamDataArray.slice(i, i + batchSize);
    const { error } = await supabase
      .from("teams")
      .upsert(batch as unknown[], { onConflict: "external_id" });

    if (error) {
      errors.push(`Teams batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      synced += batch.length;
    }
  }

  return { synced, errors };
}

async function syncFixtures(
  supabase: any,
  leagueIds: number[],
  dateFrom: string,
  dateTo: string,
  season?: number
): Promise<{ synced: number; created: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let created = 0;
  let updated = 0;
  const currentSeason = season || new Date().getFullYear();

  // First, get all leagues and teams mappings
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, external_id") as { data: LeagueRow[] | null };
  const { data: teams } = await supabase
    .from("teams")
    .select("id, external_id") as { data: TeamRow[] | null };

  const leagueMap = new Map(leagues?.map((l) => [l.external_id, l.id]) || []);
  const teamMap = new Map(teams?.map((t) => [t.external_id, t.id]) || []);

  for (const leagueId of leagueIds) {
    try {
      const fixtures = await fetchFromApiFootball<ApiFootballFixture>(
        "/fixtures",
        {
          league: leagueId,
          season: currentSeason,
          from: dateFrom,
          to: dateTo,
        }
      );

      for (const f of fixtures) {
        const externalId = String(f.fixture.id);
        const leagueUuid = leagueMap.get(String(f.league.id));
        const homeTeamUuid = teamMap.get(String(f.teams.home.id));
        const awayTeamUuid = teamMap.get(String(f.teams.away.id));

        // Map API-Football status to Stadio status
        const statusMap: Record<string, { status: string; isLive: boolean }> = {
          NS: { status: "draft", isLive: false },
          TBD: { status: "draft", isLive: false },
          "1H": { status: "published", isLive: true },
          HT: { status: "published", isLive: true },
          "2H": { status: "published", isLive: true },
          ET: { status: "published", isLive: true },
          BT: { status: "published", isLive: true },
          P: { status: "published", isLive: true },
          SUSP: { status: "published", isLive: true },
          INT: { status: "published", isLive: true },
          LIVE: { status: "published", isLive: true },
          FT: { status: "published", isLive: false },
          AET: { status: "published", isLive: false },
          PEN: { status: "published", isLive: false },
          PST: { status: "archived", isLive: false },
          CANC: { status: "archived", isLive: false },
          ABD: { status: "archived", isLive: false },
          AWD: { status: "archived", isLive: false },
          WO: { status: "archived", isLive: false },
        };

        const matchStatus = f.fixture.status.short;
        const stadioStatus = statusMap[matchStatus] || { status: "draft", isLive: false };

        const eventData = {
          external_id: externalId,
          sport: "football",
          league: f.league.name,
          league_id: leagueUuid,
          home_team: f.teams.home.name,
          home_team_id: homeTeamUuid,
          away_team: f.teams.away.name,
          away_team_id: awayTeamUuid,
          api_title: `${f.teams.home.name} vs ${f.teams.away.name}`,
          api_description: `${f.league.name} - ${f.league.round}`,
          api_image_url: f.teams.home.logo,
          event_date: f.fixture.date,
          venue: f.fixture.venue?.name,
          round: f.league.round,
          season: f.league.season,
          match_status: matchStatus,
          home_score: f.goals.home,
          away_score: f.goals.away,
          is_live: stadioStatus.isLive,
          last_sync_at: new Date().toISOString(),
        };

        // Check if event exists
        const { data: existing } = await supabase
          .from("events")
          .select("id, status")
          .eq("external_id", externalId)
          .maybeSingle() as { data: EventRow | null };

        if (existing) {
          // Update existing - don't overwrite status if manually set
          const { error } = await supabase
            .from("events")
            .update({
              ...eventData,
              // Keep existing status unless it's draft
              status: existing.status === "draft" ? stadioStatus.status : existing.status,
            } as unknown)
            .eq("id", existing.id);

          if (error) {
            errors.push(`Update fixture ${externalId}: ${error.message}`);
          } else {
            updated++;
            synced++;
          }
        } else {
          // Create new
          const { error } = await supabase.from("events").insert({
            ...eventData,
            status: stadioStatus.status,
          } as unknown);

          if (error) {
            errors.push(`Insert fixture ${externalId}: ${error.message}`);
          } else {
            created++;
            synced++;
          }
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      errors.push(
        `Fixtures league ${leagueId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { synced, created, updated, errors };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req, ["owner", "admin"]);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { supabase } = authResult;

    // Parse request
    const body: SyncRequest = await req.json();
    const { action, leagueIds, dateFrom, dateTo, season } = body;

    if (!action) {
      return errorResponse("action is required", 400);
    }

    // Default date range: today to 14 days ahead
    const defaultDateFrom = new Date().toISOString().split("T")[0];
    const defaultDateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let result: Record<string, unknown> = {};

    switch (action) {
      case "check_status": {
        // Lightweight check: fetch account status from API-Football
        const apiKey = Deno.env.get("API_FOOTBALL_KEY");
        if (!apiKey) {
          return successResponse({
            action: "check_status",
            connected: false,
            error: "API_FOOTBALL_KEY non configurée",
          });
        }

        try {
          const response = await fetch(`${API_FOOTBALL_BASE_URL}/status`, {
            headers: {
              "x-rapidapi-key": apiKey,
              "x-rapidapi-host": "v3.football.api-sports.io",
            },
          });

          const data = await response.json();
          
          if (data.errors && Object.keys(data.errors).length > 0) {
            const errorMsg = typeof data.errors === 'object' 
              ? Object.values(data.errors).join(', ')
              : JSON.stringify(data.errors);
            return successResponse({
              action: "check_status",
              connected: false,
              error: errorMsg,
            });
          }

          const account = data.response?.account || {};
          const subscription = data.response?.subscription || {};
          const requests = data.response?.requests || {};

          return successResponse({
            action: "check_status",
            connected: true,
            account: {
              firstname: account.firstname,
              lastname: account.lastname,
              email: account.email,
            },
            subscription: {
              plan: subscription.plan,
              end: subscription.end,
              active: subscription.active,
            },
            requests: {
              current: requests.current,
              limit_day: requests.limit_day,
            },
          });
        } catch (err) {
          return successResponse({
            action: "check_status",
            connected: false,
            error: err instanceof Error ? err.message : "Erreur de connexion",
          });
        }
      }

      case "sync_leagues": {
        const leaguesResult = await syncLeagues(supabase, leagueIds);
        result = {
          action: "sync_leagues",
          ...leaguesResult,
        };
        break;
      }

      case "sync_teams": {
        let ids = leagueIds || [];
        if (!ids.length) {
          // Get synced leagues from database
          const { data: syncedLeagues } = await supabase
            .from("leagues")
            .select("external_id")
            .eq("is_synced", true) as { data: { external_id: string }[] | null };

          ids = syncedLeagues?.map((l) => parseInt(l.external_id)) || [];
          if (!ids.length) {
            return errorResponse(
              "Sélectionnez des ligues (badges en haut) ou importez-les d'abord avec 'Sync Leagues', puis cochez celles à suivre.",
              400
            );
          }
        }
        const teamsResult = await syncTeams(supabase, ids);
        result = {
          action: "sync_teams",
          ...teamsResult,
        };
        break;
      }

      case "sync_fixtures": {
        let ids = leagueIds || [];
        if (!ids.length) {
          // Get synced leagues from database
          const { data: syncedLeagues } = await supabase
            .from("leagues")
            .select("external_id")
            .eq("is_synced", true) as { data: { external_id: string }[] | null };

          ids = syncedLeagues?.map((l) => parseInt(l.external_id)) || [];
          if (!ids.length) {
            return errorResponse(
              "Sélectionnez des ligues (badges en haut) ou importez-les d'abord avec 'Sync Leagues', puis cochez celles à suivre.",
              400
            );
          }
        }
        const fixturesResult = await syncFixtures(
          supabase,
          ids,
          dateFrom || defaultDateFrom,
          dateTo || defaultDateTo,
          season
        );
        result = {
          action: "sync_fixtures",
          ...fixturesResult,
        };
        break;
      }

      case "sync_all": {
        // Step 1: Sync leagues
        const leaguesResult = await syncLeagues(supabase, leagueIds);

        // Step 2: Get synced league IDs
        const { data: syncedLeagues } = await supabase
          .from("leagues")
          .select("external_id")
          .eq("is_synced", true) as { data: { external_id: string }[] | null };

        const syncedIds = syncedLeagues?.map((l) => parseInt(l.external_id)) || [];

        // Step 3: Sync teams for those leagues
        const teamsResult = await syncTeams(supabase, syncedIds);

        // Step 4: Sync fixtures
        const fixturesResult = await syncFixtures(
          supabase,
          syncedIds,
          dateFrom || defaultDateFrom,
          dateTo || defaultDateTo,
          season
        );

        result = {
          action: "sync_all",
          leagues: leaguesResult,
          teams: teamsResult,
          fixtures: fixturesResult,
        };
        break;
      }

      case "get_fixtures_preview": {
        const ids = leagueIds || [];
        if (!ids.length) {
          return errorResponse("leagueIds is required for get_fixtures_preview", 400);
        }

        const currentSeason = season || new Date().getFullYear();
        const fixtures: Array<{
          id: number;
          date: string;
          homeTeam: string;
          awayTeam: string;
          homeLogo: string;
          awayLogo: string;
          venue: string | null;
          round: string;
          status: string;
        }> = [];

        for (const leagueId of ids) {
          try {
            const apiFixtures = await fetchFromApiFootball<ApiFootballFixture>(
              "/fixtures",
              {
                league: leagueId,
                season: currentSeason,
                from: dateFrom || defaultDateFrom,
                to: dateTo || defaultDateTo,
              }
            );

            for (const f of apiFixtures) {
              fixtures.push({
                id: f.fixture.id,
                date: f.fixture.date,
                homeTeam: f.teams.home.name,
                awayTeam: f.teams.away.name,
                homeLogo: f.teams.home.logo,
                awayLogo: f.teams.away.logo,
                venue: f.fixture.venue?.name || null,
                round: f.league.round,
                status: f.fixture.status.short,
              });
            }
          } catch (err) {
            console.error(`Error fetching fixtures for league ${leagueId}:`, err);
          }
        }

        return successResponse({
          action: "get_fixtures_preview",
          fixtures,
        });
      }

      case "import_fixtures": {
        const fixtureIdsToImport = body.fixtureIds || [];
        if (!fixtureIdsToImport.length) {
          return errorResponse("fixtureIds is required for import_fixtures", 400);
        }

        const currentSeason = season || new Date().getFullYear();
        let created = 0;
        let updated = 0;
        const errors: string[] = [];

        // Get league and team mappings
        const { data: leagues } = await supabase
          .from("leagues")
          .select("id, external_id") as { data: LeagueRow[] | null };
        const { data: teams } = await supabase
          .from("teams")
          .select("id, external_id") as { data: TeamRow[] | null };

        const leagueMap = new Map(leagues?.map((l) => [l.external_id, l.id]) || []);
        const teamMap = new Map(teams?.map((t) => [t.external_id, t.id]) || []);

        // Fetch each fixture by ID
        for (const fixtureId of fixtureIdsToImport) {
          try {
            const fixtures = await fetchFromApiFootball<ApiFootballFixture>(
              "/fixtures",
              { id: fixtureId }
            );

            if (!fixtures.length) continue;
            const f = fixtures[0];

            const externalId = String(f.fixture.id);
            const leagueUuid = leagueMap.get(String(f.league.id));
            const homeTeamUuid = teamMap.get(String(f.teams.home.id));
            const awayTeamUuid = teamMap.get(String(f.teams.away.id));

            const statusMap: Record<string, { status: string; isLive: boolean }> = {
              NS: { status: "draft", isLive: false },
              TBD: { status: "draft", isLive: false },
              "1H": { status: "published", isLive: true },
              HT: { status: "published", isLive: true },
              "2H": { status: "published", isLive: true },
              ET: { status: "published", isLive: true },
              BT: { status: "published", isLive: true },
              P: { status: "published", isLive: true },
              SUSP: { status: "published", isLive: true },
              INT: { status: "published", isLive: true },
              LIVE: { status: "published", isLive: true },
              FT: { status: "published", isLive: false },
              AET: { status: "published", isLive: false },
              PEN: { status: "published", isLive: false },
              PST: { status: "archived", isLive: false },
              CANC: { status: "archived", isLive: false },
              ABD: { status: "archived", isLive: false },
              AWD: { status: "archived", isLive: false },
              WO: { status: "archived", isLive: false },
            };

            const matchStatus = f.fixture.status.short;
            const stadioStatus = statusMap[matchStatus] || { status: "draft", isLive: false };

            const eventData = {
              external_id: externalId,
              sport: "football",
              league: f.league.name,
              league_id: leagueUuid,
              home_team: f.teams.home.name,
              home_team_id: homeTeamUuid,
              away_team: f.teams.away.name,
              away_team_id: awayTeamUuid,
              api_title: `${f.teams.home.name} vs ${f.teams.away.name}`,
              api_description: `${f.league.name} - ${f.league.round}`,
              api_image_url: f.teams.home.logo,
              event_date: f.fixture.date,
              venue: f.fixture.venue?.name,
              round: f.league.round,
              season: f.league.season,
              match_status: matchStatus,
              home_score: f.goals.home,
              away_score: f.goals.away,
              is_live: stadioStatus.isLive,
              last_sync_at: new Date().toISOString(),
            };

            // Check if event exists
            const { data: existing } = await supabase
              .from("events")
              .select("id, status")
              .eq("external_id", externalId)
              .maybeSingle() as { data: EventRow | null };

            if (existing) {
              const { error } = await supabase
                .from("events")
                .update({
                  ...eventData,
                  status: existing.status === "draft" ? stadioStatus.status : existing.status,
                } as unknown)
                .eq("id", existing.id);

              if (error) {
                errors.push(`Update fixture ${externalId}: ${error.message}`);
              } else {
                updated++;
              }
            } else {
              const { error } = await supabase.from("events").insert({
                ...eventData,
                status: stadioStatus.status,
              } as unknown);

              if (error) {
                errors.push(`Insert fixture ${externalId}: ${error.message}`);
              } else {
                created++;
              }
            }

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            errors.push(
              `Fixture ${fixtureId}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        return successResponse({
          action: "import_fixtures",
          created,
          updated,
          errors,
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }

    return successResponse(result);
  } catch (err) {
    console.error("API-Football sync error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
