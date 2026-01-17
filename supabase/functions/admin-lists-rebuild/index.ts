import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { logAudit, getRequestMetadata } from '../_shared/audit.ts';

interface RebuildRequest {
  categoryId?: string; // Optional: rebuild specific category, or all if not provided
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

    const { userId, userEmail, role } = authResult;
    const body = await req.json().catch(() => ({}));
    const { categoryId }: RebuildRequest = body;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let categoriesToRebuild: Array<{ id: string; name_en: string; auto_rules: Record<string, unknown> }> = [];

    if (categoryId) {
      // Rebuild specific category
      const { data, error } = await serviceClient
        .from('categories')
        .select('id, name_en, auto_rules')
        .eq('id', categoryId)
        .single();

      if (error || !data) {
        return errorResponse('Category not found', 404);
      }
      categoriesToRebuild = [data];
    } else {
      // Rebuild all visible categories
      const { data, error } = await serviceClient
        .from('categories')
        .select('id, name_en, auto_rules')
        .eq('is_visible', true);

      if (error) {
        return errorResponse('Failed to fetch categories', 500);
      }
      categoriesToRebuild = data || [];
    }

    const results: Array<{ categoryId: string; name: string; eventsMatched: number }> = [];

    for (const category of categoriesToRebuild) {
      // Apply auto_rules to find matching events
      // This is a simplified implementation - in production, auto_rules would contain
      // complex filters like sport type, date ranges, leagues, etc.
      const rules = category.auto_rules as Record<string, unknown> || {};
      
      let query = serviceClient
        .from('events')
        .select('id')
        .eq('status', 'published');

      // Apply rules (example: filter by sport)
      if (rules.sport) {
        query = query.eq('sport', rules.sport);
      }
      if (rules.league) {
        query = query.ilike('league', `%${rules.league}%`);
      }

      const { data: matchingEvents, count } = await query;

      results.push({
        categoryId: category.id,
        name: category.name_en,
        eventsMatched: matchingEvents?.length || 0,
      });

      // Update category with rebuilt list timestamp
      await serviceClient
        .from('categories')
        .update({ updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', category.id);
    }

    // Log audit with new signature
    const { ipAddress, userAgent } = getRequestMetadata(req);
    await logAudit({
      actorUserId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action: 'lists.rebuild',
      entity: 'categories',
      entityId: categoryId || undefined,
      before: undefined,
      after: { 
        categoriesProcessed: categoriesToRebuild.length,
        results: results.map(r => ({ id: r.categoryId, matched: r.eventsMatched }))
      },
      metadata: { 
        source: 'admin_api',
        batch: !categoryId,
        categoryCount: categoriesToRebuild.length
      },
      ipAddress,
      userAgent,
    });

    console.log(`Lists rebuilt: ${categoriesToRebuild.length} categories processed by ${userEmail}`);

    return successResponse({
      categoriesProcessed: categoriesToRebuild.length,
      results,
    });
  } catch (error) {
    console.error('Lists rebuild error:', error);
    return errorResponse('Internal server error', 500);
  }
});
