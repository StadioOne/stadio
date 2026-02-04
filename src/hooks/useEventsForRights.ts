import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventFilters {
  leagueId?: string;
  sportId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'published' | 'draft' | 'all';
}

export interface EventForRights {
  id: string;
  api_title: string | null;
  override_title: string | null;
  event_date: string;
  sport: string;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  status: string;
}

export function useEventsForRights(filters: EventFilters) {
  return useQuery({
    queryKey: ['events-for-rights', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('id, api_title, override_title, event_date, sport, league, home_team, away_team, status')
        .order('event_date', { ascending: true });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('event_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('event_date', filters.dateTo);
      }

      if (filters.leagueId) {
        query = query.eq('league', filters.leagueId);
      }

      if (filters.sportId) {
        query = query.eq('sport', filters.sportId);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      return (data || []) as EventForRights[];
    },
    enabled: !!(filters.dateFrom || filters.dateTo || filters.leagueId),
  });
}

export function useLeaguesForSelect() {
  return useQuery({
    queryKey: ['leagues-for-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSportsForSelect() {
  return useQuery({
    queryKey: ['sports-for-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name, name_fr')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });
}
