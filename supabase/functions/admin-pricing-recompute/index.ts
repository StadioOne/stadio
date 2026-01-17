import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';
import { validatePayload, pricingRecomputeSchema, type PricingRecomputeRequest, type PricingTier } from '../_shared/validation.ts';

interface PricingConfig {
  tier: PricingTier;
  min_price: number;
  max_price: number;
  base_price: number;
}

interface EventData {
  id: string;
  league: string | null;
  is_pinned: boolean;
  is_live: boolean;
  sport: string;
  home_team: string | null;
  away_team: string | null;
}

interface PricingResult {
  eventId: string;
  previousPrice: number | null;
  previousTier: PricingTier | null;
  newPrice: number;
  newTier: PricingTier;
  isManualOverride: boolean;
}

// Calculate pricing tier and price based on event data
function calculatePricing(
  event: EventData,
  pricingConfigs: PricingConfig[]
): { price: number; tier: PricingTier } {
  let baseScore = 0;
  const league = event.league?.toLowerCase() || '';
  
  // League factor (major leagues get higher scores)
  if (league.includes('champions league') || league.includes('champions')) {
    baseScore += 45;
  } else if (league.includes('premier league') || league.includes('premier')) {
    baseScore += 40;
  } else if (league.includes('la liga') || league.includes('liga')) {
    baseScore += 35;
  } else if (league.includes('serie a')) {
    baseScore += 35;
  } else if (league.includes('bundesliga')) {
    baseScore += 35;
  } else if (league.includes('ligue 1')) {
    baseScore += 30;
  } else if (league.includes('europa league')) {
    baseScore += 35;
  } else if (league.includes('world cup') || league.includes('euro')) {
    baseScore += 50;
  } else {
    baseScore += 15;
  }
  
  // Pinned event bonus (featured content)
  if (event.is_pinned) {
    baseScore += 15;
  }
  
  // Live event bonus
  if (event.is_live) {
    baseScore += 10;
  }
  
  // Determine tier based on score
  let tier: PricingTier;
  if (baseScore >= 45) {
    tier = 'gold';
  } else if (baseScore >= 30) {
    tier = 'silver';
  } else {
    tier = 'bronze';
  }
  
  // Get tier configuration
  const tierConfig = pricingConfigs.find(c => c.tier === tier);
  if (!tierConfig) {
    // Fallback if tier not found
    return { price: 9.99, tier: 'bronze' };
  }
  
  // Calculate price with score-based adjustment
  let price = tierConfig.base_price;
  
  // Slight adjustment based on score within tier
  const scoreWithinTier = baseScore % 15;
  const adjustment = (scoreWithinTier / 15) * (tierConfig.max_price - tierConfig.base_price) * 0.5;
  price += adjustment;
  
  // Apply min/max constraints
  price = Math.max(tierConfig.min_price, Math.min(tierConfig.max_price, price));
  
  // Round to 2 decimal places
  price = Math.round(price * 100) / 100;
  
  return { price, tier };
}

// Recompute pricing for a single event
async function recomputeEventPricing(
  serviceClient: SupabaseClient,
  event: EventData,
  pricingConfigs: PricingConfig[],
  userId: string,
  manualOverride?: { price?: number; tier?: PricingTier; isOverride?: boolean }
): Promise<PricingResult> {
  const now = new Date().toISOString();
  
  // Get current pricing if exists
  const { data: currentPricing } = await serviceClient
    .from('event_pricing')
    .select('id, computed_price, computed_tier, manual_price, manual_tier, is_manual_override')
    .eq('event_id', event.id)
    .single();

  // Determine new values
  let newPrice: number;
  let newTier: PricingTier;
  let isManualOverride = false;

  if (manualOverride?.isOverride && manualOverride.price && manualOverride.tier) {
    // Manual override specified
    newPrice = manualOverride.price;
    newTier = manualOverride.tier;
    isManualOverride = true;

    // Apply min/max constraints even for manual overrides
    const tierConfig = pricingConfigs.find(c => c.tier === newTier);
    if (tierConfig) {
      newPrice = Math.max(tierConfig.min_price, Math.min(tierConfig.max_price, newPrice));
    }
  } else {
    // Automatic calculation
    const calculated = calculatePricing(event, pricingConfigs);
    newPrice = calculated.price;
    newTier = calculated.tier;
    isManualOverride = false;
  }

  const previousPrice = currentPricing?.is_manual_override 
    ? currentPricing.manual_price 
    : currentPricing?.computed_price;
  const previousTier = currentPricing?.is_manual_override 
    ? currentPricing.manual_tier 
    : currentPricing?.computed_tier;

  // Prepare update data
  const pricingData = isManualOverride ? {
    manual_price: newPrice,
    manual_tier: newTier,
    is_manual_override: true,
    computation_date: now,
    updated_by: userId,
    updated_at: now
  } : {
    computed_price: newPrice,
    computed_tier: newTier,
    is_manual_override: false,
    manual_price: null,
    manual_tier: null,
    computation_date: now,
    updated_by: userId,
    updated_at: now
  };

  if (currentPricing) {
    // Update existing pricing
    await serviceClient
      .from('event_pricing')
      .update(pricingData)
      .eq('id', currentPricing.id);

    // Record in pricing history
    await serviceClient
      .from('event_pricing_history')
      .insert({
        event_pricing_id: currentPricing.id,
        previous_price: previousPrice,
        previous_tier: previousTier,
        new_price: newPrice,
        new_tier: newTier,
        change_type: isManualOverride ? 'manual' : 'automatic',
        changed_by: userId
      });
  } else {
    // Insert new pricing record
    const { data: newPricingRecord } = await serviceClient
      .from('event_pricing')
      .insert({
        event_id: event.id,
        ...pricingData
      })
      .select('id')
      .single();

    // Record in pricing history
    if (newPricingRecord) {
      await serviceClient
        .from('event_pricing_history')
        .insert({
          event_pricing_id: newPricingRecord.id,
          previous_price: null,
          previous_tier: null,
          new_price: newPrice,
          new_tier: newTier,
          change_type: 'initial',
          changed_by: userId
        });
    }
  }

  return {
    eventId: event.id,
    previousPrice,
    previousTier,
    newPrice,
    newTier,
    isManualOverride
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate - requires admin or higher (pricing is critical)
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

    const validation = validatePayload(pricingRecomputeSchema, rawBody);
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }

    const { eventId, batch, manualPrice, manualTier, isManualOverride }: PricingRecomputeRequest = validation.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load pricing configuration
    const { data: pricingConfigs, error: configError } = await serviceClient
      .from('pricing_config')
      .select('tier, min_price, max_price, base_price');

    let configs: PricingConfig[] = pricingConfigs as PricingConfig[] || [];

    if (configError || !pricingConfigs || pricingConfigs.length === 0) {
      console.warn('Failed to load pricing config, using defaults:', configError);
      // Use default config if not found
      configs = [
        { tier: 'bronze', min_price: 4.99, max_price: 14.99, base_price: 9.99 },
        { tier: 'silver', min_price: 9.99, max_price: 24.99, base_price: 14.99 },
        { tier: 'gold', min_price: 14.99, max_price: 49.99, base_price: 24.99 }
      ];
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);
    const results: PricingResult[] = [];

    if (batch) {
      // Batch mode: recompute all published future events
      const { data: futureEvents, error: eventsError } = await serviceClient
        .from('events')
        .select('id, league, is_pinned, is_live, sport, home_team, away_team')
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString());

      if (eventsError) {
        console.error('Failed to fetch events for batch:', eventsError);
        return errorResponse('Failed to fetch events for batch processing', 500);
      }

      console.log(`Batch pricing recompute: processing ${futureEvents?.length || 0} events`);

      for (const event of futureEvents || []) {
        try {
          const result = await recomputeEventPricing(
            serviceClient,
            event as EventData,
            configs,
            userId
          );
          results.push(result);
        } catch (err) {
          console.error(`Failed to recompute pricing for event ${event.id}:`, err);
        }
      }

      // Log batch audit
      await logAudit(supabase, {
        userId,
        userEmail,
        action: 'pricing.batch_recompute',
        entityType: 'event_pricing',
        entityId: undefined,
        oldValues: undefined,
        newValues: {
          processed: results.length,
          summary: results.map(r => ({
            eventId: r.eventId,
            tier: r.newTier,
            price: r.newPrice
          }))
        },
        ipAddress,
        userAgent,
      });

      console.log(`Batch pricing recompute completed: ${results.length} events processed by ${userEmail}`);

      return successResponse({
        batch: true,
        processed: results.length,
        results
      });
    } else {
      // Single event mode
      const { data: event, error: eventError } = await serviceClient
        .from('events')
        .select('id, league, is_pinned, is_live, sport, home_team, away_team')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        console.error('Event fetch error:', eventError);
        return errorResponse('Event not found', 404);
      }

      const result = await recomputeEventPricing(
        serviceClient,
        event as EventData,
        configs,
        userId,
        manualPrice || manualTier ? {
          price: manualPrice,
          tier: manualTier,
          isOverride: isManualOverride
        } : undefined
      );

      // Log audit for single event
      await logAudit(supabase, {
        userId,
        userEmail,
        action: 'pricing.recompute',
        entityType: 'event_pricing',
        entityId: eventId!,
        oldValues: {
          price: result.previousPrice,
          tier: result.previousTier
        },
        newValues: {
          price: result.newPrice,
          tier: result.newTier,
          isManualOverride: result.isManualOverride
        },
        ipAddress,
        userAgent,
      });

      console.log(`Pricing recomputed for event ${eventId}: ${result.newTier} @ $${result.newPrice} by ${userEmail}`);

      return successResponse(result);
    }
  } catch (error) {
    console.error('Pricing recompute error:', error);
    return errorResponse('Internal server error', 500);
  }
});
