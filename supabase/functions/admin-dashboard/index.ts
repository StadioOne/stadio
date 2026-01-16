import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface DashboardKPIs {
  totalEvents: number;
  publishedEvents: number;
  liveEvents: number;
  totalOriginals: number;
  publishedOriginals: number;
  totalAuthors: number;
  totalCategories: number;
  recentWorkflows: number;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { supabase } = authResult;

    // Fetch KPIs in parallel using service role for aggregation
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [
      eventsResult,
      publishedEventsResult,
      liveEventsResult,
      originalsResult,
      publishedOriginalsResult,
      authorsResult,
      categoriesResult,
      workflowsResult,
    ] = await Promise.all([
      serviceClient.from('events').select('id', { count: 'exact', head: true }),
      serviceClient.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      serviceClient.from('events').select('id', { count: 'exact', head: true }).eq('is_live', true),
      serviceClient.from('originals').select('id', { count: 'exact', head: true }),
      serviceClient.from('originals').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      serviceClient.from('authors').select('id', { count: 'exact', head: true }).eq('is_active', true),
      serviceClient.from('categories').select('id', { count: 'exact', head: true }).eq('is_visible', true),
      serviceClient.from('workflow_runs').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const kpis: DashboardKPIs = {
      totalEvents: eventsResult.count || 0,
      publishedEvents: publishedEventsResult.count || 0,
      liveEvents: liveEventsResult.count || 0,
      totalOriginals: originalsResult.count || 0,
      publishedOriginals: publishedOriginalsResult.count || 0,
      totalAuthors: authorsResult.count || 0,
      totalCategories: categoriesResult.count || 0,
      recentWorkflows: workflowsResult.count || 0,
    };

    return successResponse(kpis);
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Internal server error', 500);
  }
});
