import { corsHeaders } from './cors.ts';

// Standardized error codes for observability
export type ErrorCode = 
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: ErrorCode;
  meta?: Record<string, unknown>;
  request_id?: string;
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>): Response {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  error: string, 
  status: number = 400, 
  errorCode?: ErrorCode,
  requestId?: string
): Response {
  const body: ApiResponse = { 
    success: false, 
    error,
    error_code: errorCode,
    request_id: requestId,
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function successResponseWithMeta<T>(
  data: T, 
  meta?: Record<string, unknown>,
  requestId?: string
): Response {
  const body: ApiResponse<T> = { 
    success: true, 
    data,
    meta,
    request_id: requestId,
  };
  
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Generate a unique request ID for observability
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createdResponse<T>(data: T): Response {
  const body: ApiResponse<T> = { success: true, data };
  
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
