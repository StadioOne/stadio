import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';
import { validatePayload, unpublishRequestSchema, type UnpublishRequest } from '../_shared/validation.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate - requires admin or higher (critical action)
    const authResult = await authenticateAdmin(req, ['admin']);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { userId, userEmail, supabase } = authResult;
    
    // Parse and validate payload with Zod
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = validatePayload(unpublishRequestSchema, rawBody);
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }

    const { eventId }: UnpublishRequest = validation.data;

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
      console.error('Event fetch error:', fetchError);
      return errorResponse('Event not found', 404);
    }

    // Check if already draft (idempotence)
    if (currentEvent.status === 'draft') {
      console.log(`Event ${eventId} is already a draft`);
      return successResponse(currentEvent);
    }

    const now = new Date().toISOString();

    // Remove event from all pinned categories
    const { error: unpinError } = await serviceClient
      .rpc('remove_event_from_pinned', { _event_id: eventId });

    if (unpinError) {
      console.error('Remove from pinned error:', unpinError);
      // Non-blocking - continue with unpublish
    }

    // Update event status to draft and reset published_at
    const { data: updatedEvent, error: updateError } = await serviceClient
      .from('events')
      .update({ 
        status: 'draft',
        published_at: null,
        updated_by: userId,
        updated_at: now
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      console.error('Event update error:', updateError);
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
      oldValues: { 
        status: currentEvent.status,
        published_at: currentEvent.published_at 
      },
      newValues: { 
        status: 'draft',
        published_at: null 
      },
      ipAddress,
      userAgent,
    });

    console.log(`Event ${eventId} unpublished successfully by ${userEmail}`);
    return successResponse(updatedEvent);
  } catch (error) {
    console.error('Unpublish event error:', error);
    return errorResponse('Internal server error', 500);
  }
});
