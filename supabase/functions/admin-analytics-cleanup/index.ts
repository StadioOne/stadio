import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { 
  successResponseWithMeta, 
  errorResponse, 
  generateRequestId 
} from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

interface CleanupResult {
  cutoff_date: string;
  deleted_rows_count: number;
  duration_ms: number;
}

const RETENTION_DAYS = 90;

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[${requestId}] Analytics cleanup started`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'INVALID_PAYLOAD', requestId);
  }

  try {
    // Authenticate - only owner/admin can trigger cleanup
    const authResult = await authenticateAdmin(req, ['owner', 'admin']);
    if (isAuthError(authResult)) {
      console.log(`[${requestId}] Auth failed: ${authResult.error}`);
      return errorResponse(authResult.error, authResult.status, 'FORBIDDEN', requestId);
    }

    const { userId, userEmail, role } = authResult;
    const startTime = Date.now();

    console.log(`[${requestId}] User ${userEmail} (${role}) initiating cleanup`);

    // Calculate cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`[${requestId}] Cutoff date: ${cutoffIso}`);

    // Use service role client for deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete old events and get count
    // First count the rows to be deleted
    const { count: countToDelete, error: countError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .lt('occurred_at', cutoffIso);

    if (countError) {
      console.error(`[${requestId}] Count error:`, countError);
      return errorResponse('Failed to count events for deletion', 500, 'INTERNAL_ERROR', requestId);
    }

    const rowsToDelete = countToDelete || 0;
    console.log(`[${requestId}] Found ${rowsToDelete} events to delete`);

    // Perform deletion
    const { error: deleteError } = await supabaseAdmin
      .from('analytics_events')
      .delete()
      .lt('occurred_at', cutoffIso);

    if (deleteError) {
      console.error(`[${requestId}] Delete error:`, deleteError);
      return errorResponse('Failed to delete old events', 500, 'INTERNAL_ERROR', requestId);
    }

    const durationMs = Date.now() - startTime;

    const result: CleanupResult = {
      cutoff_date: cutoffIso,
      deleted_rows_count: rowsToDelete,
      duration_ms: durationMs,
    };

    console.log(`[${requestId}] Cleanup complete: ${rowsToDelete} rows deleted in ${durationMs}ms`);

    // Log to audit
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit({
      actorUserId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action: 'analytics_cleanup',
      entity: 'analytics_events',
      entityId: undefined,
      metadata: {
        deleted_rows_count: rowsToDelete,
        cutoff_date: cutoffIso,
        retention_days: RETENTION_DAYS,
        request_id: requestId,
      },
      ipAddress,
      userAgent,
    });

    return successResponseWithMeta(result, undefined, requestId);
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', requestId);
  }
});
