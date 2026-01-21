import { ErrorCode } from './response.ts';

export interface ApiKeyAuthResult {
  valid: boolean;
  errorCode?: ErrorCode;
  errorMessage?: string;
}

const API_KEY_HEADER = 'x-stadio-analytics-key';

/**
 * Validate the Stadio Analytics API key from request headers
 * Returns validation result with error details if invalid
 */
export function validateApiKey(req: Request): ApiKeyAuthResult {
  const providedKey = req.headers.get(API_KEY_HEADER);
  const expectedKey = Deno.env.get('STADIO_ANALYTICS_KEY');

  if (!expectedKey) {
    console.error('STADIO_ANALYTICS_KEY not configured in environment');
    return {
      valid: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'API key validation not configured',
    };
  }

  if (!providedKey) {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED',
      errorMessage: `Missing required header: ${API_KEY_HEADER}`,
    };
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(providedKey, expectedKey)) {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Invalid API key',
    };
  }

  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
export function getClientIp(req: Request): string {
  // Check common proxy headers in order of preference
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return 'unknown';
}

/**
 * Generate a rate limit key from IP and API key
 */
export function getRateLimitKey(ip: string, apiKey?: string): string {
  const keyPart = apiKey ? apiKey.substring(0, 8) : 'nokey';
  return `ratelimit:${ip}:${keyPart}`;
}
