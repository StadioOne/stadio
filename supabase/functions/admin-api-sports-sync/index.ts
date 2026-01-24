import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

// Sport-specific API configuration
const SPORT_API_CONFIG: Record<string, {
  baseUrl: string;
  matchesEndpoint: string;
  matchKey: string;
  leaguesEndpoint: string;
  teamsEndpoint: string;
  statusEndpoint: string;
}> = {
  football: {
    baseUrl: 'https://v3.football.api-sports.io',
    matchesEndpoint: '/fixtures',
    matchKey: 'fixture',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  basketball: {
    baseUrl: 'https://v1.basketball.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  rugby: {
    baseUrl: 'https://v1.rugby.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  hockey: {
    baseUrl: 'https://v1.hockey.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  baseball: {
    baseUrl: 'https://v1.baseball.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  'american-football': {
    baseUrl: 'https://v1.american-football.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  'formula-1': {
    baseUrl: 'https://v1.formula-1.api-sports.io',
    matchesEndpoint: '/races',
    matchKey: 'race',
    leaguesEndpoint: '/competitions',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  handball: {
    baseUrl: 'https://v1.handball.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  volleyball: {
    baseUrl: 'https://v1.volleyball.api-sports.io',
    matchesEndpoint: '/games',
    matchKey: 'game',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/teams',
    statusEndpoint: '/status',
  },
  mma: {
    baseUrl: 'https://v1.mma.api-sports.io',
    matchesEndpoint: '/fights',
    matchKey: 'fight',
    leaguesEndpoint: '/leagues',
    teamsEndpoint: '/fighters',
    statusEndpoint: '/status',
  },
};

interface SyncRequest {
  action: 
    | 'check_status'
    | 'test_all_sports'
    | 'sync_leagues'
    | 'sync_teams'
    | 'get_games_preview'
    | 'import_games';
  sport?: string;
  leagueIds?: number[];
  gameIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  season?: number;
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

// Generic API fetch helper
async function fetchFromSportApi<T>(
  sportSlug: string,
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<{ response: T[]; errors?: string[] }> {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY');
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured');
  }

  const config = SPORT_API_CONFIG[sportSlug];
  if (!config) {
    throw new Error(`Unknown sport: ${sportSlug}`);
  }

  const url = new URL(`${config.baseUrl}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });

  console.log(`[API-Sports] Fetching ${sportSlug}: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': config.baseUrl.replace('https://', ''),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    const errorMessages = Object.values(data.errors).filter(Boolean) as string[];
    if (errorMessages.length > 0) {
      return { response: [], errors: errorMessages };
    }
  }

  return { response: data.response || [] };
}

// Check API status for a specific sport
async function checkSportStatus(sportSlug: string): Promise<ApiStatus> {
  const config = SPORT_API_CONFIG[sportSlug];
  if (!config) {
    return { connected: false };
  }

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      return { connected: false };
    }

    const url = `${config.baseUrl}${config.statusEndpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': config.baseUrl.replace('https://', ''),
      },
    });

    if (!response.ok) {
      return { connected: false };
    }

    const data = await response.json();
    
    return {
      connected: true,
      account: data.response?.account,
      subscription: data.response?.subscription,
      requests: data.response?.requests,
    };
  } catch (error) {
    console.error(`[API-Sports] Status check failed for ${sportSlug}:`, error);
    return { connected: false };
  }
}

// Test connectivity to all configured sports
async function testAllSports(): Promise<Record<string, { connected: boolean; latencyMs: number; error?: string }>> {
  const results: Record<string, { connected: boolean; latencyMs: number; error?: string }> = {};

  for (const [sportSlug, config] of Object.entries(SPORT_API_CONFIG)) {
    const startTime = Date.now();
    try {
      const status = await checkSportStatus(sportSlug);
      results[sportSlug] = {
        connected: status.connected,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      results[sportSlug] = {
        connected: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return results;
}

// Sync leagues for a sport
async function syncLeagues(
  supabase: any,
  sportSlug: string,
  sportId: string,
  leagueIds?: number[]
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const config = SPORT_API_CONFIG[sportSlug];
    const params: Record<string, string | number> = {};
    
    if (leagueIds && leagueIds.length > 0) {
      // Fetch specific leagues
      for (const leagueId of leagueIds) {
        const { response, errors: apiErrors } = await fetchFromSportApi<any>(
          sportSlug,
          config.leaguesEndpoint,
          { id: leagueId }
        );
        
        if (apiErrors) {
          errors.push(...apiErrors);
          continue;
        }

        for (const item of response) {
          const league = item.league || item;
          const country = item.country || {};

          const { error } = await supabase
            .from('leagues')
            .upsert({
              external_id: String(league.id),
              name: league.name,
              country: country.name || null,
              country_code: country.code || null,
              logo_url: league.logo || null,
              type: league.type || null,
              sport_id: sportId,
              is_active: true,
              updated_at: new Date().toISOString(),
            } as any, { onConflict: 'external_id' });

          if (error) {
            errors.push(`Failed to upsert league ${league.id}: ${error.message}`);
          } else {
            synced++;
          }
        }
      }
    } else {
      // Fetch all leagues (with current season for football)
      const fetchParams: Record<string, string | number> = sportSlug === 'football' ? { current: 'true' } : {};
      const { response, errors: apiErrors } = await fetchFromSportApi<any>(
        sportSlug,
        config.leaguesEndpoint,
        fetchParams
      );

      if (apiErrors) {
        errors.push(...apiErrors);
        return { synced, errors };
      }

      for (const item of response) {
        const league = item.league || item;
        const country = item.country || {};
        const seasons = item.seasons || [];
        const currentSeason = seasons.find((s: any) => s.current) || seasons[0];

        const { error } = await supabase
          .from('leagues')
          .upsert({
            external_id: String(league.id),
            name: league.name,
            country: country.name || null,
            country_code: country.code || null,
            logo_url: league.logo || null,
            type: league.type || null,
            season: currentSeason?.year || null,
            sport_id: sportId,
            is_active: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'external_id' });

        if (error) {
          errors.push(`Failed to upsert league ${league.id}: ${error.message}`);
        } else {
          synced++;
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during sync');
  }

  return { synced, errors };
}

// Get games preview for a sport
async function getGamesPreview(
  sportSlug: string,
  leagueId: number,
  dateFrom: string,
  dateTo: string,
  season?: number
): Promise<{ games: any[]; errors: string[] }> {
  const config = SPORT_API_CONFIG[sportSlug];
  const params: Record<string, string | number> = {
    league: leagueId,
    from: dateFrom,
    to: dateTo,
  };

  if (season) {
    params.season = season;
  }

  // For football, use different param names
  if (sportSlug === 'football') {
    delete params.from;
    delete params.to;
    params.from = dateFrom;
    params.to = dateTo;
  }

  try {
    const { response, errors } = await fetchFromSportApi<any>(
      sportSlug,
      config.matchesEndpoint,
      params
    );

    if (errors && errors.length > 0) {
      return { games: [], errors };
    }

    // Normalize response based on sport
    const games = response.map((item: any) => {
      if (sportSlug === 'football') {
        return {
          id: item.fixture?.id,
          date: item.fixture?.date,
          status: item.fixture?.status?.short,
          statusLong: item.fixture?.status?.long,
          venue: item.fixture?.venue?.name,
          homeTeam: {
            id: item.teams?.home?.id,
            name: item.teams?.home?.name,
            logo: item.teams?.home?.logo,
          },
          awayTeam: {
            id: item.teams?.away?.id,
            name: item.teams?.away?.name,
            logo: item.teams?.away?.logo,
          },
          homeScore: item.goals?.home,
          awayScore: item.goals?.away,
          league: {
            id: item.league?.id,
            name: item.league?.name,
            logo: item.league?.logo,
            round: item.league?.round,
          },
        };
      } else {
        // Generic format for other sports
        return {
          id: item.id || item.game?.id,
          date: item.date || item.game?.date?.start,
          status: item.status?.short || item.game?.status?.short,
          statusLong: item.status?.long || item.game?.status?.long,
          venue: item.venue || item.game?.venue,
          homeTeam: {
            id: item.teams?.home?.id,
            name: item.teams?.home?.name,
            logo: item.teams?.home?.logo,
          },
          awayTeam: {
            id: item.teams?.away?.id,
            name: item.teams?.away?.name,
            logo: item.teams?.away?.logo,
          },
          homeScore: item.scores?.home?.total ?? item.scores?.home,
          awayScore: item.scores?.away?.total ?? item.scores?.away,
          league: {
            id: item.league?.id,
            name: item.league?.name,
            logo: item.league?.logo,
          },
        };
      }
    });

    return { games, errors: [] };
  } catch (error) {
    return {
      games: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status as any);
    }

    const { supabase } = authResult;
    const body: SyncRequest = await req.json();
    const { action, sport, leagueIds, dateFrom, dateTo, season } = body;

    console.log(`[API-Sports] Action: ${action}, Sport: ${sport || 'all'}`);

    switch (action) {
      case 'check_status': {
        if (!sport) {
          return errorResponse('Sport is required for status check', 400);
        }
        const status = await checkSportStatus(sport);
        return successResponse({ status });
      }

      case 'test_all_sports': {
        const results = await testAllSports();
        return successResponse({ results });
      }

      case 'sync_leagues': {
        if (!sport) {
          return errorResponse('Sport is required for league sync', 400);
        }

        // Get sport ID from database
        const { data: sportData, error: sportError } = await supabase
          .from('sports')
          .select('id')
          .eq('slug', sport)
          .single();

        if (sportError || !sportData) {
          return errorResponse(`Sport not found: ${sport}`, 404);
        }

        const result = await syncLeagues(supabase, sport, sportData.id, leagueIds);
        
        // Update sport as configured if sync was successful
        if (result.synced > 0) {
          await supabase
            .from('sports')
            .update({ is_configured: true })
            .eq('slug', sport);
        }

        return successResponse(result);
      }

      case 'get_games_preview': {
        if (!sport || !leagueIds || leagueIds.length === 0) {
          return errorResponse('Sport and leagueIds are required', 400);
        }
        if (!dateFrom || !dateTo) {
          return errorResponse('dateFrom and dateTo are required', 400);
        }

        const result = await getGamesPreview(sport, leagueIds[0], dateFrom, dateTo, season);
        return successResponse(result);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('[API-Sports] Error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
