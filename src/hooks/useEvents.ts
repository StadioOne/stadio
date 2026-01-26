import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Event, EventPricing } from '@/lib/api-types';

export interface EventsFilters {
  status?: 'draft' | 'published' | 'archived' | 'all';
  sport?: string;
  league?: string;
  isLive?: boolean;
  isPinned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EventWithPricing extends Event {
  pricing: EventPricing | null;
}

export interface EventsResult {
  data: EventWithPricing[];
  total: number;
  sports: string[];
  leagues: string[];
}

export const eventQueryKeys = {
  all: ['events'] as const,
  list: (filters?: EventsFilters) => ['events', 'list', filters] as const,
  detail: (id: string) => ['events', id] as const,
  stats: ['events', 'stats'] as const,
};

export function useEvents(filters: EventsFilters = {}) {
  return useQuery<EventsResult>({
    queryKey: eventQueryKeys.list(filters),
    queryFn: async () => {
      const { limit = 50, offset = 0 } = filters;

      // Build base query
      let query = supabase
        .from('events')
        .select('*, pricing:event_pricing(*)', { count: 'exact' });

      // Apply filters
      // Always exclude 'catalog' status from Events page unless explicitly requested
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else {
        // Exclude catalog events from the main Events page
        query = query.neq('status', 'catalog');
      }

      if (filters.sport) {
        query = query.eq('sport', filters.sport);
      }

      if (filters.league) {
        query = query.eq('league', filters.league);
      }

      if (filters.isLive !== undefined) {
        query = query.eq('is_live', filters.isLive);
      }

      if (filters.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }

      if (filters.dateFrom) {
        query = query.gte('event_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('event_date', filters.dateTo);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `api_title.ilike.${searchTerm},override_title.ilike.${searchTerm},home_team.ilike.${searchTerm},away_team.ilike.${searchTerm},league.ilike.${searchTerm}`
        );
      }

      // Order and paginate
      query = query
        .order('event_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get unique sports and leagues for filters
      const { data: sportsData } = await supabase
        .from('events')
        .select('sport')
        .not('sport', 'is', null);

      const { data: leaguesData } = await supabase
        .from('events')
        .select('league')
        .not('league', 'is', null);

      const sports = [...new Set(sportsData?.map(e => e.sport) || [])].filter(Boolean) as string[];
      const leagues = [...new Set(leaguesData?.map(e => e.league) || [])].filter(Boolean) as string[];

      // Transform data to include pricing as single object
      const eventsWithPricing: EventWithPricing[] = (data || []).map((event: any) => ({
        ...event,
        pricing: Array.isArray(event.pricing) ? event.pricing[0] || null : event.pricing || null,
      }));

      return {
        data: eventsWithPricing,
        total: count || 0,
        sports,
        leagues,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useEvent(id: string) {
  return useQuery<EventWithPricing | null>({
    queryKey: eventQueryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, pricing:event_pricing(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        pricing: Array.isArray(data.pricing) ? data.pricing[0] || null : data.pricing || null,
      } as EventWithPricing;
    },
    enabled: !!id,
  });
}

export function useEventsStats() {
  return useQuery({
    queryKey: eventQueryKeys.stats,
    queryFn: async () => {
      const [totalRes, publishedRes, liveRes, draftRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_live', true),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);

      return {
        total: totalRes.count || 0,
        published: publishedRes.count || 0,
        live: liveRes.count || 0,
        draft: draftRes.count || 0,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
