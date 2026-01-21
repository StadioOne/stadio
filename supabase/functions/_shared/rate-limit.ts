import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  requestCount: number;
}

const WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_LIMIT = 60; // 60 requests per minute

/**
 * Check rate limit for a given key (typically IP + API key combination)
 * Uses a sliding window approach with the rate_limits table
 */
export async function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Get existing rate limit record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Rate limit fetch error:', fetchError);
      // Fail open - allow request but log error
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now.getTime() + windowMs),
        requestCount: 1,
      };
    }

    if (!existing) {
      // No existing record - create new one
      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          key,
          request_count: 1,
          window_start: now.toISOString(),
        });

      if (insertError) {
        console.error('Rate limit insert error:', insertError);
      }

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now.getTime() + windowMs),
        requestCount: 1,
      };
    }

    const existingWindowStart = new Date(existing.window_start);

    // Check if window has expired
    if (existingWindowStart < windowStart) {
      // Window expired - reset counter
      const { error: updateError } = await supabaseAdmin
        .from('rate_limits')
        .update({
          request_count: 1,
          window_start: now.toISOString(),
        })
        .eq('key', key);

      if (updateError) {
        console.error('Rate limit reset error:', updateError);
      }

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now.getTime() + windowMs),
        requestCount: 1,
      };
    }

    // Window still active - check count
    const newCount = existing.request_count + 1;
    const allowed = newCount <= limit;

    if (allowed) {
      // Increment counter
      const { error: updateError } = await supabaseAdmin
        .from('rate_limits')
        .update({ request_count: newCount })
        .eq('key', key);

      if (updateError) {
        console.error('Rate limit increment error:', updateError);
      }
    }

    const resetAt = new Date(existingWindowStart.getTime() + windowMs);

    return {
      allowed,
      remaining: Math.max(0, limit - newCount),
      resetAt,
      requestCount: newCount,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open on errors
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMs),
      requestCount: 1,
    };
  }
}

/**
 * Clean up expired rate limit entries (called periodically)
 */
export async function cleanupExpiredRateLimits(windowMs: number = WINDOW_MS): Promise<number> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const cutoff = new Date(Date.now() - windowMs * 2); // Keep 2x window for safety

  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .delete()
    .lt('window_start', cutoff.toISOString())
    .select('key');

  if (error) {
    console.error('Rate limit cleanup error:', error);
    return 0;
  }

  return data?.length || 0;
}
