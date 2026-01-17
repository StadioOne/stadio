import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface OriginalAnalytics {
  contentId: string;
  title: string;
  type: string;
  views: number;
  likes: number;
  topCountries: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateAdmin(req);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom') || getDefaultDateFrom();
    const dateTo = url.searchParams.get('dateTo') || new Date().toISOString().split('T')[0];
    const contentType = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch analytics data
    const { data: analyticsData, error: analyticsError } = await supabaseAdmin
      .from('analytics_daily')
      .select('entity_id, country, views, likes')
      .eq('entity_type', 'content')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (analyticsError) {
      console.error('Error fetching originals analytics:', analyticsError);
      return errorResponse('Failed to fetch originals analytics', 500);
    }

    // Aggregate by content
    const contentMap = new Map<string, {
      views: number;
      likes: number;
      countries: Map<string, number>;
    }>();

    for (const row of analyticsData || []) {
      const existing = contentMap.get(row.entity_id) || {
        views: 0,
        likes: 0,
        countries: new Map(),
      };

      existing.views += row.views || 0;
      existing.likes += row.likes || 0;

      const countryViews = existing.countries.get(row.country) || 0;
      existing.countries.set(row.country, countryViews + (row.views || 0));

      contentMap.set(row.entity_id, existing);
    }

    // Get content details
    const contentIds = Array.from(contentMap.keys());
    
    if (contentIds.length === 0) {
      return successResponse({
        originals: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    let contentsQuery = supabaseAdmin
      .from('originals')
      .select('id, title_fr, title_en, type')
      .in('id', contentIds);

    if (contentType) {
      contentsQuery = contentsQuery.eq('type', contentType);
    }

    const { data: contents, error: contentsError } = await contentsQuery;

    if (contentsError) {
      console.error('Error fetching originals:', contentsError);
    }

    const contentDetailsMap = new Map(
      (contents || []).map((c) => [c.id, c])
    );

    // Filter by content type if specified
    const filteredContentIds = contentType
      ? contentIds.filter((id) => contentDetailsMap.get(id)?.type === contentType)
      : contentIds;

    // Build response
    const originalsAnalytics: OriginalAnalytics[] = filteredContentIds
      .map((id) => {
        const stats = contentMap.get(id)!;
        const details = contentDetailsMap.get(id);
        const topCountries = Array.from(stats.countries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c]) => c);

        return {
          contentId: id,
          title: details?.title_fr || details?.title_en || 'Unknown',
          type: details?.type || 'unknown',
          views: stats.views,
          likes: stats.likes,
          topCountries,
        };
      })
      .sort((a, b) => b.views - a.views);

    const total = originalsAnalytics.length;
    const paginatedOriginals = originalsAnalytics.slice(offset, offset + limit);

    console.log(`Originals analytics: ${paginatedOriginals.length} of ${total} contents`);

    return successResponse({
      originals: paginatedOriginals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Originals analytics error:', error);
    return errorResponse('Internal server error', 500);
  }
});

function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
