import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Maximum length for string filters to prevent abuse
const MAX_FILTER_LENGTH = 100;

// Escape special LIKE pattern characters to prevent injection
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Validate and sanitize string filter input
function sanitizeStringFilter(value: string | null, maxLength: number = MAX_FILTER_LENGTH): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return undefined;
  return trimmed;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate - requires admin or owner to view audit logs
    const authResult = await authenticateAdmin(req, ['admin']);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    // Parse and sanitize query parameters
    const url = new URL(req.url);
    const filters: AuditFilters = {
      userId: sanitizeStringFilter(url.searchParams.get('userId')),
      action: sanitizeStringFilter(url.searchParams.get('action')),
      entityType: sanitizeStringFilter(url.searchParams.get('entityType')),
      entityId: sanitizeStringFilter(url.searchParams.get('entityId')),
      startDate: sanitizeStringFilter(url.searchParams.get('startDate')),
      endDate: sanitizeStringFilter(url.searchParams.get('endDate')),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    // Validate limit
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      return errorResponse('limit must be between 1 and 100', 400);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build query
    let query = serviceClient
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.action) {
      // Escape special LIKE characters to prevent pattern injection
      const escapedAction = escapeLikePattern(filters.action);
      query = query.ilike('action', `%${escapedAction}%`);
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply pagination
    query = query.range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Failed to fetch audit logs: ${error.message}`, 500);
    }

    return successResponse(data, {
      total: count || 0,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hasMore: (count || 0) > (filters.offset || 0) + (data?.length || 0),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return errorResponse('Internal server error', 500);
  }
});
