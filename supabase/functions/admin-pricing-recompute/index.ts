import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

interface RecomputeRequest {
  eventId: string;
  manualPrice?: number;
  manualTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  isManualOverride?: boolean;
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
    const { eventId, manualPrice, manualTier, isManualOverride }: RecomputeRequest = await req.json();

    if (!eventId) {
      return errorResponse('eventId is required', 400);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current pricing for audit
    const { data: currentPricing } = await serviceClient
      .from('event_pricing')
      .select('*')
      .eq('event_id', eventId)
      .single();

    // Compute new price based on event data (simplified algorithm)
    // In production, this would call an external pricing service or n8n workflow
    let computedPrice = 9.99; // Default price
    let computedTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';

    // Get event details for pricing calculation
    const { data: event } = await serviceClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (event) {
      // Simple tier logic based on sport/league
      if (event.league?.toLowerCase().includes('champions') || 
          event.league?.toLowerCase().includes('premier')) {
        computedTier = 'platinum';
        computedPrice = 24.99;
      } else if (event.league?.toLowerCase().includes('ligue 1') ||
                 event.league?.toLowerCase().includes('la liga')) {
        computedTier = 'gold';
        computedPrice = 19.99;
      } else if (event.is_pinned) {
        computedTier = 'silver';
        computedPrice = 14.99;
      }
    }

    const updateData: Record<string, unknown> = {
      computed_price: computedPrice,
      computed_tier: computedTier,
      computation_date: new Date().toISOString(),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Handle manual override
    if (isManualOverride) {
      updateData.is_manual_override = true;
      if (manualPrice !== undefined) updateData.manual_price = manualPrice;
      if (manualTier !== undefined) updateData.manual_tier = manualTier;
    } else if (isManualOverride === false) {
      updateData.is_manual_override = false;
      updateData.manual_price = null;
      updateData.manual_tier = null;
    }

    let result;
    if (currentPricing) {
      // Update existing pricing
      const { data, error } = await serviceClient
        .from('event_pricing')
        .update(updateData)
        .eq('event_id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;

      // Record in pricing history
      await serviceClient.from('event_pricing_history').insert({
        event_pricing_id: currentPricing.id,
        previous_price: currentPricing.is_manual_override ? currentPricing.manual_price : currentPricing.computed_price,
        new_price: isManualOverride ? manualPrice : computedPrice,
        previous_tier: currentPricing.is_manual_override ? currentPricing.manual_tier : currentPricing.computed_tier,
        new_tier: isManualOverride ? manualTier : computedTier,
        change_type: isManualOverride ? 'manual_override' : 'recompute',
        changed_by: userId,
      });
    } else {
      // Create new pricing record
      const { data, error } = await serviceClient
        .from('event_pricing')
        .insert({ event_id: eventId, ...updateData })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    // Log audit
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit(supabase, {
      userId,
      userEmail,
      action: isManualOverride ? 'pricing.manual_override' : 'pricing.recompute',
      entityType: 'event_pricing',
      entityId: eventId,
      oldValues: currentPricing ? { 
        price: currentPricing.is_manual_override ? currentPricing.manual_price : currentPricing.computed_price,
        tier: currentPricing.is_manual_override ? currentPricing.manual_tier : currentPricing.computed_tier,
      } : undefined,
      newValues: { 
        price: isManualOverride ? manualPrice : computedPrice,
        tier: isManualOverride ? manualTier : computedTier,
      },
      ipAddress,
      userAgent,
    });

    return successResponse(result);
  } catch (error) {
    console.error('Pricing recompute error:', error);
    return errorResponse('Internal server error', 500);
  }
});
