import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  errorResponse, 
  successResponseWithMeta, 
  generateRequestId,
  type ErrorCode 
} from '../_shared/response.ts';
import { validateApiKey, getClientIp, getRateLimitKey } from '../_shared/api-key-auth.ts';
import { checkRateLimit, cleanupExpiredRateLimits } from '../_shared/rate-limit.ts';
import { ingestEventSchema, validatePayload } from '../_shared/validation.ts';

const RATE_LIMIT = 60; // 60 requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[${requestId}] Incoming request: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return errorResponse('Method not allowed', 405, 'INVALID_PAYLOAD', requestId);
  }

  try {
    // 1. Validate API key
    const apiKeyResult = validateApiKey(req);
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
    const apiKey = req.headers.get('x-stadio-analytics-key') || '';
    const rateLimitKey = getRateLimitKey(clientIp, apiKey);

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

    // 3. Parse request body
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      console.log(`[${requestId}] Invalid JSON body`);
      return errorResponse('Invalid JSON body', 400, 'INVALID_PAYLOAD', requestId);
    }

    // 4. Validate payload with strict schema
    const validationResult = validatePayload(ingestEventSchema, rawPayload);
    if (!validationResult.success) {
      console.log(`[${requestId}] Validation failed: ${validationResult.error}`);
      return errorResponse(validationResult.error, 400, 'INVALID_PAYLOAD', requestId);
    }

    const payload = validationResult.data;

    // 5. Prepare event data
    const now = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || null;
    
    // Handle occurred_at fallback
    let occurredAt = payload.occurred_at;
    let fallbackOccurredAt = false;
    if (!occurredAt) {
      occurredAt = now;
      fallbackOccurredAt = true;
      console.log(`[${requestId}] Using fallback occurred_at`);
    }

    // Merge metadata with fallback flag
    const metadata = {
      ...payload.metadata,
      ...(fallbackOccurredAt ? { fallback_occurred_at: true } : {}),
    };

    // 6. Insert into analytics_events using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const eventData = {
      received_at: now,
      occurred_at: occurredAt,
      event_type: payload.event_type,
      source: payload.source,
      anon_id: payload.anon_id || null,
      user_id: payload.user_id || null,
      fixture_id: payload.fixture_id || null,
      content_id: payload.content_id || null,
      country: payload.country || null,
      city: payload.city || null,
      ip: clientIp !== 'unknown' ? clientIp : null,
      user_agent_full: userAgent,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };

    const { data: insertedEvent, error: insertError } = await supabaseAdmin
      .from('analytics_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      console.error(`[${requestId}] Insert error:`, insertError);
      return errorResponse('Failed to record event', 500, 'INTERNAL_ERROR', requestId);
    }

    console.log(`[${requestId}] Event recorded: ${insertedEvent.id}`);

    // 7. Occasionally cleanup expired rate limits (1% of requests)
    if (Math.random() < 0.01) {
      cleanupExpiredRateLimits(RATE_WINDOW_MS).then((count) => {
        if (count > 0) {
          console.log(`[${requestId}] Cleaned up ${count} expired rate limits`);
        }
      }).catch(console.error);
    }

    // 8. Return success response
    return successResponseWithMeta(
      { event_id: insertedEvent.id },
      {
        rate_limit_remaining: rateLimitResult.remaining,
      },
      requestId
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', requestId);
  }
});
