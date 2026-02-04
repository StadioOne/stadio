import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse, generateRequestId } from '../_shared/response.ts';
import { validatePublicApiKey, getClientIp } from '../_shared/public-api-auth.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface RightsResolveRequest {
  event_id: string;
  country: string;
}

interface BroadcasterInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface RightsInfo {
  live: boolean;
  replay: boolean;
  highlights: boolean;
  replay_until: string | null;
  platform: 'ott' | 'linear' | 'both';
  exclusivity: 'exclusive' | 'shared' | 'non_exclusive';
}

interface RightsResolveResponse {
  authorized: boolean;
  event_id: string;
  country: string;
  broadcaster?: BroadcasterInfo;
  rights?: RightsInfo;
  multiple_broadcasters?: boolean;
  all_broadcasters?: BroadcasterInfo[];
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = generateRequestId();

  // Only GET method
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405, 'INVALID_PAYLOAD', requestId);
  }

  // Validate API key
  const apiKeyResult = validatePublicApiKey(req);
  if (!apiKeyResult.valid) {
    return errorResponse(
      apiKeyResult.errorMessage || 'Unauthorized',
      401,
      apiKeyResult.errorCode,
      requestId
    );
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitKey = `rights-resolve:${clientIp}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, 100, 60000); // 100 requests per minute
  
  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000);
    return errorResponse(
      `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      429,
      'RATE_LIMITED',
      requestId
    );
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const eventId = url.searchParams.get('event_id');
    const country = url.searchParams.get('country')?.toUpperCase();

    if (!eventId) {
      return errorResponse('Missing required parameter: event_id', 400, 'VALIDATION_ERROR', requestId);
    }

    if (!country) {
      return errorResponse('Missing required parameter: country', 400, 'VALIDATION_ERROR', requestId);
    }

    // Validate country code format (2 letter ISO code)
    if (!/^[A-Z]{2}$/.test(country)) {
      return errorResponse('Invalid country code format. Expected ISO 3166-1 alpha-2 (e.g., FR, US, DE)', 400, 'VALIDATION_ERROR', requestId);
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, event_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return errorResponse('Event not found', 404, 'NOT_FOUND', requestId);
    }

    if (event.status !== 'published') {
      return errorResponse('Event is not published', 404, 'NOT_FOUND', requestId);
    }

    // Find active rights for this event and country
    const { data: rights, error: rightsError } = await supabase
      .from('rights_events')
      .select(`
        id,
        rights_live,
        rights_replay,
        rights_highlights,
        replay_window_hours,
        territories_allowed,
        territories_blocked,
        exclusivity,
        platform,
        status,
        expires_at,
        broadcaster:broadcasters!inner(
          id,
          name,
          logo_url,
          status
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'active');

    if (rightsError) {
      console.error('Error fetching rights:', rightsError);
      return errorResponse('Internal error', 500, 'INTERNAL_ERROR', requestId);
    }

    // Filter rights by territory
    const matchingRights = (rights || []).filter((right) => {
      // Check if country is blocked
      const blocked = (right.territories_blocked as string[]) || [];
      if (blocked.includes(country)) {
        return false;
      }

      // Check if country is allowed
      const allowed = (right.territories_allowed as string[]) || [];
      // If allowed list is empty, consider it as worldwide
      if (allowed.length === 0) {
        return true;
      }

      return allowed.includes(country);
    });

    // Check expiration
    const now = new Date();
    const validRights = matchingRights.filter((right) => {
      if (right.expires_at && new Date(right.expires_at) < now) {
        return false;
      }
      return true;
    });

    // Filter to only active broadcasters
    const activeRights = validRights.filter((right) => {
      const broadcasterData = right.broadcaster as unknown as { status: string };
      return broadcasterData.status === 'active';
    });

    // No rights found
    if (activeRights.length === 0) {
      const response: RightsResolveResponse = {
        authorized: false,
        event_id: eventId,
        country,
      };
      return successResponse(response, { request_id: requestId });
    }

    // Calculate replay_until for the first matching right
    const primaryRight = activeRights[0];
    let replayUntil: string | null = null;

    if (primaryRight.rights_replay && primaryRight.replay_window_hours) {
      const eventDate = new Date(event.event_date);
      const replayEnd = new Date(eventDate.getTime() + primaryRight.replay_window_hours * 60 * 60 * 1000);
      replayUntil = replayEnd > now ? replayEnd.toISOString() : null;
    }

    const broadcaster = primaryRight.broadcaster as unknown as { id: string; name: string; logo_url: string | null };

    const response: RightsResolveResponse = {
      authorized: true,
      event_id: eventId,
      country,
      broadcaster: {
        id: broadcaster.id,
        name: broadcaster.name,
        logo_url: broadcaster.logo_url,
      },
      rights: {
        live: primaryRight.rights_live,
        replay: primaryRight.rights_replay && replayUntil !== null,
        highlights: primaryRight.rights_highlights,
        replay_until: replayUntil,
        platform: primaryRight.platform,
        exclusivity: primaryRight.exclusivity,
      },
    };

    // If multiple broadcasters have rights (shared), include all
    if (activeRights.length > 1) {
      response.multiple_broadcasters = true;
      response.all_broadcasters = activeRights.map((r) => {
        const b = r.broadcaster as unknown as { id: string; name: string; logo_url: string | null };
        return {
          id: b.id,
          name: b.name,
          logo_url: b.logo_url,
        };
      });
    }

    return successResponse(response, { request_id: requestId });

  } catch (error) {
    console.error('Rights resolve error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', requestId);
  }
});
