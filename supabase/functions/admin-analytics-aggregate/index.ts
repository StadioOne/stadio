import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { 
  successResponseWithMeta, 
  errorResponse, 
  generateRequestId 
} from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

interface AggregationResult {
  date: string;
  fixturesProcessed: number;
  contentsProcessed: number;
  totalRowsUpserted: number;
  durationMs: number;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[${requestId}] Analytics aggregation started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'INVALID_PAYLOAD', requestId);
  }

  try {
    // Authenticate - only owner/admin can trigger aggregation
    const authResult = await authenticateAdmin(req, ['owner', 'admin']);
    if (isAuthError(authResult)) {
      console.log(`[${requestId}] Auth failed: ${authResult.error}`);
      return errorResponse(authResult.error, authResult.status, 'FORBIDDEN', requestId);
    }

    const { userId, userEmail, role } = authResult;
    const startTime = Date.now();

    // Parse request body for optional date override
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || getYesterdayDate();
    } catch {
      targetDate = getYesterdayDate();
    }

    console.log(`[${requestId}] User ${userEmail} (${role}) starting aggregation for date: ${targetDate}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch raw events for the target date using occurred_at
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: rawEvents, error: eventsError } = await supabaseAdmin
      .from('analytics_events')
      .select('event_type, fixture_id, content_id, country, metadata')
      .gte('occurred_at', startOfDay)
      .lte('occurred_at', endOfDay);

    if (eventsError) {
      console.error(`[${requestId}] Error fetching raw events:`, eventsError);
      return errorResponse('Failed to fetch raw events', 500, 'INTERNAL_ERROR', requestId);
    }

    console.log(`[${requestId}] Found ${rawEvents?.length || 0} raw events for ${targetDate}`);

    // Aggregate events
    type AggKey = string;
    interface AggData {
      views: number;
      purchases: number;
      revenue: number;
      likes: number;
    }

    const aggregates = new Map<AggKey, AggData>();

    for (const event of rawEvents || []) {
      let entityType: string | null = null;
      let entityId: string | null = null;

      if (event.fixture_id) {
        entityType = 'fixture';
        entityId = event.fixture_id;
      } else if (event.content_id) {
        entityType = 'content';
        entityId = event.content_id;
      }

      if (!entityType || !entityId) continue;

      const country = event.country || 'unknown';
      const key: AggKey = `${targetDate}|${entityType}|${entityId}|${country}`;

      const existing = aggregates.get(key) || { views: 0, purchases: 0, revenue: 0, likes: 0 };

      switch (event.event_type) {
        case 'view_fixture':
        case 'view_content':
          existing.views += 1;
          break;
        case 'purchase_fixture':
          existing.purchases += 1;
          existing.revenue += parseFloat(event.metadata?.price || '0');
          break;
        case 'like_content':
          existing.likes += 1;
          break;
      }

      aggregates.set(key, existing);
    }

    console.log(`[${requestId}] Aggregated into ${aggregates.size} unique combinations`);

    // Upsert into analytics_daily
    let rowsUpserted = 0;
    let fixturesProcessed = new Set<string>();
    let contentsProcessed = new Set<string>();

    for (const [key, data] of aggregates.entries()) {
      const [date, entityType, entityId, country] = key.split('|');

      const { error: upsertError } = await supabaseAdmin
        .from('analytics_daily')
        .upsert(
          {
            date,
            entity_type: entityType,
            entity_id: entityId,
            country,
            views: data.views,
            purchases: data.purchases,
            revenue: data.revenue,
            likes: data.likes,
            aggregated_at: new Date().toISOString(),
          },
          {
            onConflict: 'date,entity_type,entity_id,country',
          }
        );

      if (upsertError) {
        console.error(`[${requestId}] Error upserting aggregate for ${key}:`, upsertError);
        continue;
      }

      rowsUpserted++;
      if (entityType === 'fixture') {
        fixturesProcessed.add(entityId);
      } else {
        contentsProcessed.add(entityId);
      }
    }

    const durationMs = Date.now() - startTime;

    const result: AggregationResult = {
      date: targetDate,
      fixturesProcessed: fixturesProcessed.size,
      contentsProcessed: contentsProcessed.size,
      totalRowsUpserted: rowsUpserted,
      durationMs,
    };

    // Log to audit
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit({
      actorUserId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action: 'analytics_aggregate',
      entity: 'analytics_daily',
      entityId: undefined,
      after: result as unknown as Record<string, unknown>,
      metadata: { request_id: requestId },
      ipAddress,
      userAgent,
    });

    console.log(`[${requestId}] Aggregation complete: ${rowsUpserted} rows in ${durationMs}ms`);

    return successResponseWithMeta(result, undefined, requestId);
  } catch (error) {
    console.error(`[${requestId}] Analytics aggregation error:`, error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', requestId);
  }
});

function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}
