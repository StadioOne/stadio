import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface FixtureAnalytics {
  fixtureId: string;
  title: string;
  sport: string;
  league: string | null;
  eventDate: string | null;
  views: number;
  purchases: number;
  revenue: number;
  pricingTier: string | null;
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

    const { role } = authResult;
    const canSeeRevenue = role === 'owner' || role === 'admin';

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom') || getDefaultDateFrom();
    const dateTo = url.searchParams.get('dateTo') || new Date().toISOString().split('T')[0];
    const country = url.searchParams.get('country');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build query for analytics data
    let query = supabaseAdmin
      .from('analytics_daily')
      .select('entity_id, country, views, purchases, revenue')
      .eq('entity_type', 'fixture')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (country) {
      query = query.eq('country', country);
    }

    const { data: analyticsData, error: analyticsError } = await query;

    if (analyticsError) {
      console.error('Error fetching fixture analytics:', analyticsError);
      return errorResponse('Failed to fetch fixture analytics', 500);
    }

    // Aggregate by fixture
    const fixtureMap = new Map<string, {
      views: number;
      purchases: number;
      revenue: number;
      countries: Map<string, number>;
    }>();

    for (const row of analyticsData || []) {
      const existing = fixtureMap.get(row.entity_id) || {
        views: 0,
        purchases: 0,
        revenue: 0,
        countries: new Map(),
      };

      existing.views += row.views || 0;
      existing.purchases += row.purchases || 0;
      existing.revenue += parseFloat(row.revenue || '0');

      const countryRevenue = existing.countries.get(row.country) || 0;
      existing.countries.set(row.country, countryRevenue + parseFloat(row.revenue || '0'));

      fixtureMap.set(row.entity_id, existing);
    }

    // Get fixture details and pricing
    const fixtureIds = Array.from(fixtureMap.keys());
    
    if (fixtureIds.length === 0) {
      return successResponse({
        fixtures: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const { data: fixtures, error: fixturesError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        override_title,
        api_title,
        sport,
        league,
        event_date
      `)
      .in('id', fixtureIds);

    if (fixturesError) {
      console.error('Error fetching fixtures:', fixturesError);
    }

    // Get pricing info
    const { data: pricingData } = await supabaseAdmin
      .from('event_pricing')
      .select('event_id, computed_tier, manual_tier, is_manual_override')
      .in('event_id', fixtureIds);

    const pricingMap = new Map(
      (pricingData || []).map((p) => [
        p.event_id,
        p.is_manual_override ? p.manual_tier : p.computed_tier,
      ])
    );

    const fixtureDetailsMap = new Map(
      (fixtures || []).map((f) => [f.id, f])
    );

    // Build response
    const fixturesAnalytics: FixtureAnalytics[] = Array.from(fixtureMap.entries())
      .map(([id, stats]) => {
        const details = fixtureDetailsMap.get(id);
        const topCountries = Array.from(stats.countries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c]) => c);

        return {
          fixtureId: id,
          title: details?.override_title || details?.api_title || 'Unknown',
          sport: details?.sport || 'Unknown',
          league: details?.league || null,
          eventDate: details?.event_date || null,
          views: stats.views,
          purchases: stats.purchases,
          revenue: canSeeRevenue ? stats.revenue : 0,
          pricingTier: pricingMap.get(id) || null,
          topCountries,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const total = fixturesAnalytics.length;
    const paginatedFixtures = fixturesAnalytics.slice(offset, offset + limit);

    console.log(`Fixtures analytics: ${paginatedFixtures.length} of ${total} fixtures`);

    return successResponse({
      fixtures: paginatedFixtures,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Fixtures analytics error:', error);
    return errorResponse('Internal server error', 500);
  }
});

function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
