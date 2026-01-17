import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata, cleanDiff } from '../_shared/audit.ts';
import { validatePayload, publishRequestSchema, type PublishRequest } from '../_shared/validation.ts';

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

    const { userId, userEmail, role } = authResult;
    
    // Parse and validate payload with Zod
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = validatePayload(publishRequestSchema, rawBody);
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }

    const { eventId }: PublishRequest = validation.data;

    // Use service role for the update
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

    // Check if already published (idempotence)
    if (currentEvent.status === 'published') {
      console.log(`Event ${eventId} is already published`);
      return successResponse(currentEvent);
    }

    const now = new Date().toISOString();

    // Update event status with published_at timestamp
    const { data: updatedEvent, error: updateError } = await serviceClient
      .from('events')
      .update({ 
        status: 'published',
        published_at: now,
        updated_by: userId,
        updated_at: now
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      console.error('Event update error:', updateError);
      return errorResponse(`Failed to publish event: ${updateError.message}`, 500);
    }

    // Ensure pricing record exists, create default if missing
    const { data: existingPricing } = await serviceClient
      .from('event_pricing')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (!existingPricing) {
      console.log(`Creating default pricing for event ${eventId}`);
      
      // Calculate initial tier based on event data
      let computedTier: 'bronze' | 'silver' | 'gold' = 'bronze';
      let computedPrice = 9.99;

      // Simple tier calculation based on league
      const league = currentEvent.league?.toLowerCase() || '';
      if (league.includes('champions') || league.includes('premier')) {
        computedTier = 'gold';
        computedPrice = 24.99;
      } else if (league.includes('ligue 1') || league.includes('la liga') || league.includes('serie a')) {
        computedTier = 'silver';
        computedPrice = 14.99;
      }

      // Boost for pinned events
      if (currentEvent.is_pinned && computedTier !== 'gold') {
        computedTier = computedTier === 'bronze' ? 'silver' : 'gold';
        computedPrice = computedTier === 'silver' ? 14.99 : 24.99;
      }

      const { error: pricingError } = await serviceClient
        .from('event_pricing')
        .insert({
          event_id: eventId,
          computed_price: computedPrice,
          computed_tier: computedTier,
          computation_date: now,
          is_manual_override: false,
          updated_by: userId
        });

      if (pricingError) {
        console.error('Pricing creation error:', pricingError);
        // Non-blocking - event is still published
      }
    }

    // Log audit with new signature
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit({
      actorUserId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action: 'event.publish',
      entity: 'events',
      entityId: eventId,
      before: cleanDiff({ 
        status: currentEvent.status,
        published_at: currentEvent.published_at 
      }),
      after: cleanDiff({ 
        status: 'published',
        published_at: now 
      }),
      metadata: { source: 'admin_api' },
      ipAddress,
      userAgent,
    });

    console.log(`Event ${eventId} published successfully by ${userEmail}`);
    return successResponse(updatedEvent);
  } catch (error) {
    console.error('Publish event error:', error);
    return errorResponse('Internal server error', 500);
  }
});
