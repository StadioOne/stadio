import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type RightsExclusivity = Database['public']['Enums']['rights_exclusivity'];
export type RightsStatus = Database['public']['Enums']['rights_status'];
export type RightsPlatform = Database['public']['Enums']['rights_platform'];

export interface RightsFilters {
  broadcasterId: string;
  sportId?: string;
  leagueId?: string;
  dateFrom?: string;
  dateTo?: string;
  exclusivity?: RightsExclusivity | 'all';
  status?: RightsStatus | 'all';
  search?: string;
}

export interface RightWithEvent {
  id: string;
  event_id: string;
  broadcaster_id: string;
  package_id: string | null;
  rights_live: boolean;
  rights_replay: boolean;
  rights_highlights: boolean;
  replay_window_hours: number | null;
  territories_allowed: string[];
  territories_blocked: string[];
  exclusivity: RightsExclusivity;
  platform: RightsPlatform;
  status: RightsStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  event: {
    id: string;
    api_title: string | null;
    override_title: string | null;
    event_date: string;
    sport: string;
    league: string | null;
    home_team: string | null;
    away_team: string | null;
  };
}

export function useRightsEvents(filters: RightsFilters) {
  return useQuery({
    queryKey: ['rights-events', filters],
    queryFn: async () => {
      let query = supabase
        .from('rights_events')
        .select(`
          *,
          event:events!inner(
            id,
            api_title,
            override_title,
            event_date,
            sport,
            league,
            home_team,
            away_team
          )
        `)
        .eq('broadcaster_id', filters.broadcasterId)
        .order('created_at', { ascending: false });

      if (filters.exclusivity && filters.exclusivity !== 'all') {
        query = query.eq('exclusivity', filters.exclusivity);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('event.event_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('event.event_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search locally (on event title)
      let results = (data || []) as unknown as RightWithEvent[];
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter((r) => {
          const title = r.event.override_title || r.event.api_title || '';
          const teams = `${r.event.home_team || ''} ${r.event.away_team || ''}`;
          return title.toLowerCase().includes(searchLower) || 
                 teams.toLowerCase().includes(searchLower);
        });
      }

      // Filter by sport/league locally
      if (filters.sportId) {
        results = results.filter((r) => r.event.sport === filters.sportId);
      }
      
      if (filters.leagueId) {
        results = results.filter((r) => r.event.league === filters.leagueId);
      }

      return results;
    },
    enabled: !!filters.broadcasterId,
  });
}

export function useRightsStats(broadcasterId: string) {
  return useQuery({
    queryKey: ['rights-stats', broadcasterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rights_events')
        .select('status, exclusivity')
        .eq('broadcaster_id', broadcasterId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        active: data?.filter((r) => r.status === 'active').length || 0,
        draft: data?.filter((r) => r.status === 'draft').length || 0,
        exclusive: data?.filter((r) => r.exclusivity === 'exclusive').length || 0,
      };

      return stats;
    },
    enabled: !!broadcasterId,
  });
}
