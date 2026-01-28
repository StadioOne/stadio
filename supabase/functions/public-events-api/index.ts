import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  errorResponse, 
  successResponseWithMeta, 
  generateRequestId,
  type ErrorCode 
} from '../_shared/response.ts';
import { validatePublicApiKey, getClientIp, getPublicApiRateLimitKey } from '../_shared/public-api-auth.ts';
import { checkRateLimit, cleanupExpiredRateLimits } from '../_shared/rate-limit.ts';

const RATE_LIMIT = 100; // 100 requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[${requestId}] Incoming request: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return errorResponse('Method not allowed', 405, 'INVALID_PAYLOAD', requestId);
  }

  try {
    // 1. Validate API key
    const apiKeyResult = validatePublicApiKey(req);
    if (!apiKeyResult.valid) {
      console.log(`[${requestId}] API key validation failed: ${apiKeyResult.errorMessage}`);
      return errorResponse(
        apiKeyResult.errorMessage || 'Unauthorized',
        401,
        apiKeyResult.errorCode as ErrorCode,
        requestId
      );
    }

    // 2. Get client IP and check rate limit
    const clientIp = getClientIp(req);
    const apiKey = req.headers.get('x-stadio-api-key') || '';
    const rateLimitKey = getPublicApiRateLimitKey(clientIp, apiKey);

    console.log(`[${requestId}] Client IP: ${clientIp}`);

    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT, RATE_WINDOW_MS);
    
    if (!rateLimitResult.allowed) {
      console.log(`[${requestId}] Rate limited: ${rateLimitResult.requestCount}/${RATE_LIMIT}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Try again later.',
          error_code: 'RATE_LIMITED',
          request_id: requestId,
          meta: {
            retry_after_seconds: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
            limit: RATE_LIMIT,
          },
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // 3. Parse query parameters
    const url = new URL(req.url);
    const params = {
      id: url.searchParams.get('id'),
      sport: url.searchParams.get('sport'),
      sport_id: url.searchParams.get('sport_id'),
      league: url.searchParams.get('league'),
      is_live: url.searchParams.get('is_live'),
      is_pinned: url.searchParams.get('is_pinned'),
      date_from: url.searchParams.get('date_from'),
      date_to: url.searchParams.get('date_to'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT),
      offset: parseInt(url.searchParams.get('offset') || '0', 10) || 0,
    };

    console.log(`[${requestId}] Query params:`, JSON.stringify(params));

    // 4. Build and execute query
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabaseAdmin
      .from('events_published')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.id) {
      query = query.eq('id', params.id);
    }
    if (params.sport) {
      query = query.ilike('sport', `%${params.sport}%`);
    }
    if (params.sport_id) {
      query = query.eq('sport_id', params.sport_id);
    }
    if (params.league) {
      query = query.ilike('league', `%${params.league}%`);
    }
    if (params.is_live !== null) {
      query = query.eq('is_live', params.is_live === 'true');
    }
    if (params.is_pinned !== null) {
      query = query.eq('is_pinned', params.is_pinned === 'true');
    }
    if (params.date_from) {
      query = query.gte('event_date', params.date_from);
    }
    if (params.date_to) {
      query = query.lte('event_date', params.date_to);
    }

    // Apply pagination and ordering
    query = query
      .order('event_date', { ascending: true })
      .range(params.offset, params.offset + params.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error(`[${requestId}] Database error:`, error);
      return errorResponse('Failed to fetch events', 500, 'INTERNAL_ERROR', requestId);
    }

    console.log(`[${requestId}] Found ${count} events, returning ${data?.length || 0}`);

    // 5. Occasionally cleanup expired rate limits (1% of requests)
    if (Math.random() < 0.01) {
      cleanupExpiredRateLimits(RATE_WINDOW_MS).then((cleanedCount) => {
        if (cleanedCount > 0) {
          console.log(`[${requestId}] Cleaned up ${cleanedCount} expired rate limits`);
        }
      }).catch(console.error);
    }

    // 6. Return success response with rate limit headers
    const response = successResponseWithMeta(
      data || [],
      {
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
        rate_limit_remaining: rateLimitResult.remaining,
      },
      requestId
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    return response;
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', requestId);
  }
});
