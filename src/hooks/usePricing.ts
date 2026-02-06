import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface PricingFilters {
  priceStatus?: 'all' | 'with_price' | 'without_price';
  status?: 'all' | 'draft' | 'published';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PricingStats {
  total: number;
  withPrice: number;
  withoutPrice: number;
  averagePrice: number;
}

export interface EventWithPrice {
  id: string;
  api_title: string | null;
  override_title: string | null;
  sport: string;
  league: string | null;
  event_date: string;
  status: Database['public']['Enums']['content_status'];
  home_team: string | null;
  away_team: string | null;
  price: number | null;
}

export const pricingQueryKeys = {
  all: ['pricing'] as const,
  stats: () => [...pricingQueryKeys.all, 'stats'] as const,
  events: (filters: PricingFilters) => [...pricingQueryKeys.all, 'events', filters] as const,
};

// Fetch pricing statistics from events table
export function usePricingStats() {
  return useQuery({
    queryKey: pricingQueryKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('price')
        .in('status', ['draft', 'published']);

      if (error) throw error;

      const total = data?.length || 0;
      const withPrice = data?.filter((e) => e.price != null).length || 0;
      const withoutPrice = total - withPrice;
      const prices = data?.filter((e) => e.price != null).map((e) => Number(e.price)) || [];
      const averagePrice = prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : 0;

      const stats: PricingStats = { total, withPrice, withoutPrice, averagePrice };
      return stats;
    },
  });
}

// Fetch events with their price
export function useEventsPricing(filters: PricingFilters = {}) {
  return useQuery({
    queryKey: pricingQueryKeys.events(filters),
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('id, api_title, override_title, sport, league, event_date, status, home_team, away_team, price', { count: 'exact' })
        .in('status', ['draft', 'published'])
        .order('event_date', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        const s = `%${filters.search}%`;
        query = query.or(`api_title.ilike.${s},override_title.ilike.${s},home_team.ilike.${s},away_team.ilike.${s},league.ilike.${s}`);
      }

      if (filters.priceStatus === 'with_price') {
        query = query.not('price', 'is', null);
      } else if (filters.priceStatus === 'without_price') {
        query = query.is('price', null);
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: events, error, count } = await query;
      if (error) throw error;

      return {
        events: (events || []) as EventWithPrice[],
        total: count || 0,
      };
    },
  });
}
