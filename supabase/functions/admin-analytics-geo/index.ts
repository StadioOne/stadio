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

interface GeoConcentration {
  top3Percentage: number;
  top5Percentage: number;
  top10Percentage: number;
}

interface GeoAnalytics {
  byCountry: CountryStats[];
  concentration: GeoConcentration;
  totalCountries: number;
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
    const entityType = url.searchParams.get('entityType'); // 'fixture' or 'content'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build query
    let query = supabaseAdmin
      .from('analytics_daily')
      .select('country, views, purchases, revenue')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .neq('country', 'unknown');

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data: geoData, error: geoError } = await query;

    if (geoError) {
      console.error('Error fetching geo analytics:', geoError);
      return errorResponse('Failed to fetch geo analytics', 500);
    }

    // Aggregate by country
    const countryMap = new Map<string, { views: number; purchases: number; revenue: number }>();
    let totalRevenue = 0;

    for (const row of geoData || []) {
      const existing = countryMap.get(row.country) || { views: 0, purchases: 0, revenue: 0 };
      const rowRevenue = parseFloat(row.revenue || '0');
      
      countryMap.set(row.country, {
        views: existing.views + (row.views || 0),
        purchases: existing.purchases + (row.purchases || 0),
        revenue: existing.revenue + rowRevenue,
      });
      
      totalRevenue += rowRevenue;
    }

    // Sort by revenue and calculate percentages
    const sortedCountries: CountryStats[] = Array.from(countryMap.entries())
      .map(([country, stats]) => ({
        country,
        views: stats.views,
        purchases: stats.purchases,
        revenue: canSeeRevenue ? stats.revenue : 0,
        percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate concentration
    const top3 = sortedCountries.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0);
    const top5 = sortedCountries.slice(0, 5).reduce((sum, c) => sum + c.percentage, 0);
    const top10 = sortedCountries.slice(0, 10).reduce((sum, c) => sum + c.percentage, 0);

    const response: GeoAnalytics = {
      byCountry: sortedCountries.slice(0, 20), // Return top 20
      concentration: {
        top3Percentage: Math.round(top3 * 100) / 100,
        top5Percentage: Math.round(top5 * 100) / 100,
        top10Percentage: Math.round(top10 * 100) / 100,
      },
      totalCountries: sortedCountries.length,
    };

    console.log(`Geo analytics: ${response.totalCountries} countries, top3: ${response.concentration.top3Percentage}%`);

    return successResponse(response);
  } catch (error) {
    console.error('Geo analytics error:', error);
    return errorResponse('Internal server error', 500);
  }
});

function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
