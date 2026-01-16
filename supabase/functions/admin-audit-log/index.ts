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

    // Parse query parameters
    const url = new URL(req.url);
    const filters: AuditFilters = {
      userId: url.searchParams.get('userId') || undefined,
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      entityId: url.searchParams.get('entityId') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
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
      query = query.ilike('action', `%${filters.action}%`);
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
