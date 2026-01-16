import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

interface UnpublishRequest {
  eventId: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate - requires editor or higher
    const authResult = await authenticateAdmin(req, ['editor']);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { userId, userEmail, supabase } = authResult;
    const { eventId }: UnpublishRequest = await req.json();

    if (!eventId) {
      return errorResponse('eventId is required', 400);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current state for audit
    const { data: currentEvent, error: fetchError } = await serviceClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !currentEvent) {
      return errorResponse('Event not found', 404);
    }

    // Update event status to draft
    const { data: updatedEvent, error: updateError } = await serviceClient
      .from('events')
      .update({ 
        status: 'draft',
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(`Failed to unpublish event: ${updateError.message}`, 500);
    }

    // Log audit
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit(supabase, {
      userId,
      userEmail,
      action: 'event.unpublish',
      entityType: 'events',
      entityId: eventId,
      oldValues: { status: currentEvent.status },
      newValues: { status: 'draft' },
      ipAddress,
      userAgent,
    });

    return successResponse(updatedEvent);
  } catch (error) {
    console.error('Unpublish event error:', error);
    return errorResponse('Internal server error', 500);
  }
});
