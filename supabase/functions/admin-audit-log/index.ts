import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError, type AdminRole } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

/**
 * GET /admin-audit-log
 * 
 * Role-based access:
 * - owner: full access
 * - admin: full access
 * - editor: limited to events, originals, categories
 * - support: read-only all
 */

interface AuditFilters {
  entity?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// Entities accessible by editors
const EDITOR_ALLOWED_ENTITIES = ['events', 'originals', 'categories'];

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
    // Authenticate - all admin roles can access (with different visibility)
    const authResult = await authenticateAdmin(req, ['support']);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { role } = authResult;

    // Parse and sanitize query parameters (aligned with spec)
    const url = new URL(req.url);
    const filters: AuditFilters = {
      entity: sanitizeStringFilter(url.searchParams.get('entity')),
      entityId: sanitizeStringFilter(url.searchParams.get('entityId')),
      actorUserId: sanitizeStringFilter(url.searchParams.get('actorUserId')),
      action: sanitizeStringFilter(url.searchParams.get('action')),
      dateFrom: sanitizeStringFilter(url.searchParams.get('dateFrom')),
      dateTo: sanitizeStringFilter(url.searchParams.get('dateTo')),
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

    // Role-based filtering: editor can only see specific entities
    if (role === 'editor') {
      if (filters.entity && !EDITOR_ALLOWED_ENTITIES.includes(filters.entity)) {
        return errorResponse(`Access denied: editors cannot view ${filters.entity} logs`, 403);
      }
      // Restrict to allowed entities
      query = query.in('entity', EDITOR_ALLOWED_ENTITIES);
    }

    // Apply filters
    if (filters.actorUserId) {
      query = query.eq('actor_user_id', filters.actorUserId);
    }
    if (filters.action) {
      const escapedAction = escapeLikePattern(filters.action);
      query = query.ilike('action', `%${escapedAction}%`);
    }
    if (filters.entity) {
      query = query.eq('entity', filters.entity);
    }
    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply pagination
    query = query.range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );

    const { data, error, count } = await query;

    if (error) {
      console.error('Audit log query error:', error);
      return errorResponse(`Failed to fetch audit logs: ${error.message}`, 500);
    }

    // Normalize response for DataTable consumption
    const logs = data?.map(log => ({
      id: log.id,
      actorUserId: log.actor_user_id,
      actorEmail: log.actor_email,
      actorRole: log.actor_role,
      action: log.action,
      entity: log.entity,
      entityId: log.entity_id,
      diff: {
        before: log.old_values,
        after: log.new_values,
      },
      metadata: log.metadata,
      createdAt: log.created_at,
      ipAddress: log.ip_address,
    }));

    return successResponse({
      logs,
      pagination: {
        total: count || 0,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (count || 0) > (filters.offset || 0) + (data?.length || 0),
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return errorResponse('Internal server error', 500);
  }
});
