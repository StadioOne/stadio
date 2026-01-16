import { corsHeaders } from './cors.ts';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>): Response {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: string, status: number = 400): Response {
  const body: ApiResponse = { success: false, error };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function createdResponse<T>(data: T): Response {
  const body: ApiResponse<T> = { success: true, data };
  
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
