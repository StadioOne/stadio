import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];
type EventPricing = Database['public']['Tables']['event_pricing']['Row'];
type PricingTier = Database['public']['Enums']['pricing_tier'];

export interface PricingFilters {
  tier?: PricingTier | 'all';
  overrideType?: 'all' | 'computed' | 'manual';
  status?: 'all' | 'draft' | 'published';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PricingStats {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  manual: number;
}

export interface EventWithPricing {
  id: string;
  api_title: string | null;
  override_title: string | null;
  sport: string;
  league: string | null;
  event_date: string;
  status: Database['public']['Enums']['content_status'];
  home_team: string | null;
  away_team: string | null;
  pricing: EventPricing | null;
}

export interface PricingHistoryEntry {
  id: string;
  previous_price: number | null;
  new_price: number | null;
  previous_tier: PricingTier | null;
  new_tier: PricingTier | null;
  change_type: string | null;
  changed_by: string | null;
  created_at: string;
  event_title: string | null;
  event_sport: string | null;
  event_league: string | null;
  actor_email: string | null;
  actor_name: string | null;
}

export const pricingQueryKeys = {
  all: ['pricing'] as const,
  config: () => [...pricingQueryKeys.all, 'config'] as const,
  stats: () => [...pricingQueryKeys.all, 'stats'] as const,
  events: (filters: PricingFilters) => [...pricingQueryKeys.all, 'events', filters] as const,
  history: (limit: number) => [...pricingQueryKeys.all, 'history', limit] as const,
};

// Fetch pricing tier configuration
export function usePricingConfig() {
  return useQuery({
    queryKey: pricingQueryKeys.config(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('tier');

      if (error) throw error;
      return data as PricingConfig[];
    },
  });
}

// Fetch pricing statistics
export function usePricingStats() {
  return useQuery({
    queryKey: pricingQueryKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_pricing')
        .select('computed_tier, is_manual_override');

      if (error) throw error;

      const stats: PricingStats = {
        total: data?.length || 0,
        gold: data?.filter((p) => (p.computed_tier || 'bronze') === 'gold').length || 0,
        silver: data?.filter((p) => (p.computed_tier || 'bronze') === 'silver').length || 0,
        bronze: data?.filter((p) => (p.computed_tier || 'bronze') === 'bronze').length || 0,
        manual: data?.filter((p) => p.is_manual_override).length || 0,
      };

      return stats;
    },
  });
}

// Fetch events with their pricing
export function useEventsPricing(filters: PricingFilters = {}) {
  return useQuery({
    queryKey: pricingQueryKeys.events(filters),
    queryFn: async () => {
      // First get events
      let query = supabase
        .from('events')
        .select(`
          id, 
          api_title, 
          override_title, 
          sport, 
          league, 
          event_date, 
          status, 
          home_team, 
          away_team
        `, { count: 'exact' })
        .in('status', ['draft', 'published'])
        .order('event_date', { ascending: false });

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`api_title.ilike.${searchTerm},override_title.ilike.${searchTerm},home_team.ilike.${searchTerm},away_team.ilike.${searchTerm},league.ilike.${searchTerm}`);
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: events, error: eventsError, count } = await query;

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        return { events: [], total: 0 };
      }

      // Get pricing for all events
      const eventIds = events.map((e) => e.id);
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_pricing')
        .select('*')
        .in('event_id', eventIds);

      if (pricingError) throw pricingError;

      // Map pricing to events
      const pricingMap = new Map(pricingData?.map((p) => [p.event_id, p]));
      
      let eventsWithPricing: EventWithPricing[] = events.map((event) => ({
        ...event,
        pricing: pricingMap.get(event.id) || null,
      }));

      // Apply tier filter (after fetching since it's on pricing table)
      if (filters.tier && filters.tier !== 'all') {
        eventsWithPricing = eventsWithPricing.filter((e) => {
          const effectiveTier = e.pricing?.is_manual_override 
            ? e.pricing?.manual_tier 
            : e.pricing?.computed_tier;
          return effectiveTier === filters.tier;
        });
      }

      // Apply override type filter
      if (filters.overrideType && filters.overrideType !== 'all') {
        eventsWithPricing = eventsWithPricing.filter((e) => {
          if (filters.overrideType === 'manual') {
            return e.pricing?.is_manual_override === true;
          }
          return e.pricing?.is_manual_override !== true;
        });
      }

      return {
        events: eventsWithPricing,
        total: count || 0,
      };
    },
  });
}

// Fetch pricing history
export function usePricingHistory(limit = 50) {
  return useQuery({
    queryKey: pricingQueryKeys.history(limit),
    queryFn: async () => {
      // Get history entries
      const { data: historyData, error: historyError } = await supabase
        .from('event_pricing_history')
        .select(`
          id,
          previous_price,
          new_price,
          previous_tier,
          new_tier,
          change_type,
          changed_by,
          created_at,
          event_pricing_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (historyError) throw historyError;

      if (!historyData || historyData.length === 0) {
        return [];
      }

      // Get pricing entries to get event IDs
      const pricingIds = historyData.map((h) => h.event_pricing_id);
      const { data: pricingData } = await supabase
        .from('event_pricing')
        .select('id, event_id')
        .in('id', pricingIds);

      const pricingToEventMap = new Map(pricingData?.map((p) => [p.id, p.event_id]));

      // Get events
      const eventIds = Array.from(new Set(pricingData?.map((p) => p.event_id) || []));
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, api_title, override_title, sport, league')
        .in('id', eventIds);

      const eventsMap = new Map(eventsData?.map((e) => [e.id, e]));

      // Get actors
      const changedByIds = Array.from(new Set(historyData.map((h) => h.changed_by).filter(Boolean)));
      let actorsMap = new Map<string, { email: string | null; full_name: string | null }>();
      
      if (changedByIds.length > 0) {
        const { data: actorsData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', changedByIds);

        actorsMap = new Map(actorsData?.map((a) => [a.user_id, { email: a.email, full_name: a.full_name }]));
      }

      // Combine data
      const entries: PricingHistoryEntry[] = historyData.map((h) => {
        const eventId = pricingToEventMap.get(h.event_pricing_id);
        const event = eventId ? eventsMap.get(eventId) : null;
        const actor = h.changed_by ? actorsMap.get(h.changed_by) : null;

        return {
          id: h.id,
          previous_price: h.previous_price,
          new_price: h.new_price,
          previous_tier: h.previous_tier,
          new_tier: h.new_tier,
          change_type: h.change_type,
          changed_by: h.changed_by,
          created_at: h.created_at,
          event_title: event?.override_title || event?.api_title || null,
          event_sport: event?.sport || null,
          event_league: event?.league || null,
          actor_email: actor?.email || null,
          actor_name: actor?.full_name || null,
        };
      });

      return entries;
    },
  });
}
