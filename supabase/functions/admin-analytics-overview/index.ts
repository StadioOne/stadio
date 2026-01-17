import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface CountryStats {
  country: string;
  views: number;
  purchases: number;
  revenue: number;
  percentage: number;
}

interface FixtureStats {
  fixtureId: string;
  title: string;
  sport: string;
  views: number;
  purchases: number;
  revenue: number;
}

interface ContentStats {
  contentId: string;
  title: string;
  type: string;
  views: number;
  likes: number;
}

interface AnalyticsOverview {
  totalRevenue: number | null;
  totalPurchases: number;
  totalViews: number;
  totalLikes: number;
  topCountries: CountryStats[];
  topFixtures: FixtureStats[];
  topContents: ContentStats[];
  period: { from: string; to: string };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req);
    if (isAuthError(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { role } = authResult;
    const canSeeRevenue = role === 'owner' || role === 'admin';

    // Parse query params
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom') || getDefaultDateFrom();
    const dateTo = url.searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

    // Create service role client for aggregated data access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get totals
    const { data: totalsData, error: totalsError } = await supabaseAdmin
      .from('analytics_daily')
      .select('views, purchases, revenue, likes')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (totalsError) {
      console.error('Error fetching totals:', totalsError);
      return errorResponse('Failed to fetch analytics totals', 500);
    }

    const totals = (totalsData || []).reduce(
      (acc, row) => ({
        views: acc.views + (row.views || 0),
        purchases: acc.purchases + (row.purchases || 0),
        revenue: acc.revenue + parseFloat(row.revenue || '0'),
        likes: acc.likes + (row.likes || 0),
      }),
      { views: 0, purchases: 0, revenue: 0, likes: 0 }
    );

    // Get top countries
    const { data: countryData, error: countryError } = await supabaseAdmin
      .from('analytics_daily')
      .select('country, views, purchases, revenue')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .neq('country', 'unknown');

    if (countryError) {
      console.error('Error fetching country data:', countryError);
    }

    // Aggregate by country
    const countryMap = new Map<string, { views: number; purchases: number; revenue: number }>();
    for (const row of countryData || []) {
      const existing = countryMap.get(row.country) || { views: 0, purchases: 0, revenue: 0 };
      countryMap.set(row.country, {
        views: existing.views + (row.views || 0),
        purchases: existing.purchases + (row.purchases || 0),
        revenue: existing.revenue + parseFloat(row.revenue || '0'),
      });
    }

    const topCountries: CountryStats[] = Array.from(countryMap.entries())
      .map(([country, stats]) => ({
        country,
        views: stats.views,
        purchases: stats.purchases,
        revenue: canSeeRevenue ? stats.revenue : 0,
        percentage: totals.revenue > 0 ? (stats.revenue / totals.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get top fixtures
    const { data: fixtureData, error: fixtureError } = await supabaseAdmin
      .from('analytics_daily')
      .select('entity_id, views, purchases, revenue')
      .eq('entity_type', 'fixture')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (fixtureError) {
      console.error('Error fetching fixture data:', fixtureError);
    }

    // Aggregate by fixture
    const fixtureMap = new Map<string, { views: number; purchases: number; revenue: number }>();
    for (const row of fixtureData || []) {
      const existing = fixtureMap.get(row.entity_id) || { views: 0, purchases: 0, revenue: 0 };
      fixtureMap.set(row.entity_id, {
        views: existing.views + (row.views || 0),
        purchases: existing.purchases + (row.purchases || 0),
        revenue: existing.revenue + parseFloat(row.revenue || '0'),
      });
    }

    // Get fixture details
    const fixtureIds = Array.from(fixtureMap.keys());
    let fixtureDetails: Record<string, { title: string; sport: string }> = {};
    
    if (fixtureIds.length > 0) {
      const { data: fixtures } = await supabaseAdmin
        .from('events')
        .select('id, override_title, api_title, sport')
        .in('id', fixtureIds);

      fixtureDetails = (fixtures || []).reduce((acc, f) => {
        acc[f.id] = {
          title: f.override_title || f.api_title || 'Untitled',
          sport: f.sport || 'Unknown',
        };
        return acc;
      }, {} as Record<string, { title: string; sport: string }>);
    }

    const topFixtures: FixtureStats[] = Array.from(fixtureMap.entries())
      .map(([id, stats]) => ({
        fixtureId: id,
        title: fixtureDetails[id]?.title || 'Unknown',
        sport: fixtureDetails[id]?.sport || 'Unknown',
        views: stats.views,
        purchases: stats.purchases,
        revenue: canSeeRevenue ? stats.revenue : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get top contents
    const { data: contentData, error: contentError } = await supabaseAdmin
      .from('analytics_daily')
      .select('entity_id, views, likes')
      .eq('entity_type', 'content')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (contentError) {
      console.error('Error fetching content data:', contentError);
    }

    // Aggregate by content
    const contentMap = new Map<string, { views: number; likes: number }>();
    for (const row of contentData || []) {
      const existing = contentMap.get(row.entity_id) || { views: 0, likes: 0 };
      contentMap.set(row.entity_id, {
        views: existing.views + (row.views || 0),
        likes: existing.likes + (row.likes || 0),
      });
    }

    // Get content details
    const contentIds = Array.from(contentMap.keys());
    let contentDetails: Record<string, { title: string; type: string }> = {};
    
    if (contentIds.length > 0) {
      const { data: contents } = await supabaseAdmin
        .from('originals')
        .select('id, title_fr, title_en, type')
        .in('id', contentIds);

      contentDetails = (contents || []).reduce((acc, c) => {
        acc[c.id] = {
          title: c.title_fr || c.title_en || 'Untitled',
          type: c.type || 'unknown',
        };
        return acc;
      }, {} as Record<string, { title: string; type: string }>);
    }

    const topContents: ContentStats[] = Array.from(contentMap.entries())
      .map(([id, stats]) => ({
        contentId: id,
        title: contentDetails[id]?.title || 'Unknown',
        type: contentDetails[id]?.type || 'unknown',
        views: stats.views,
        likes: stats.likes,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const response: AnalyticsOverview = {
      totalRevenue: canSeeRevenue ? totals.revenue : null,
      totalPurchases: totals.purchases,
      totalViews: totals.views,
      totalLikes: totals.likes,
      topCountries,
      topFixtures,
      topContents,
      period: { from: dateFrom, to: dateTo },
    };

    console.log(`Analytics overview fetched for period ${dateFrom} to ${dateTo}`);
    return successResponse(response);
  } catch (error) {
    console.error('Analytics overview error:', error);
    return errorResponse('Internal server error', 500);
  }
});

function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
