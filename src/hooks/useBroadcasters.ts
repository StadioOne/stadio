import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BroadcasterStatus = 'active' | 'suspended' | 'pending';

export interface Broadcaster {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  contact_email: string | null;
  status: BroadcasterStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcasterWithStats extends Broadcaster {
  activeRightsCount: number;
  territories: string[];
}

export interface BroadcastersFilters {
  status?: BroadcasterStatus | 'all';
  search?: string;
}

export function useBroadcasters(filters: BroadcastersFilters = {}) {
  return useQuery({
    queryKey: ['broadcasters', filters],
    queryFn: async () => {
      // Get broadcasters
      let query = supabase
        .from('broadcasters')
        .select('*')
        .order('name');
      
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      const { data: broadcasters, error } = await query;
      
      if (error) throw error;
      
      // Get rights counts and territories for each broadcaster
      const broadcastersWithStats: BroadcasterWithStats[] = await Promise.all(
        (broadcasters || []).map(async (broadcaster) => {
          const { data: rights } = await supabase
            .from('rights_events')
            .select('id, territories_allowed, status')
            .eq('broadcaster_id', broadcaster.id)
            .eq('status', 'active');
          
          const allTerritories = new Set<string>();
          (rights || []).forEach(r => {
            (r.territories_allowed || []).forEach((t: string) => allTerritories.add(t));
          });
          
          return {
            ...broadcaster,
            status: broadcaster.status as BroadcasterStatus,
            activeRightsCount: rights?.length || 0,
            territories: Array.from(allTerritories).slice(0, 5), // Limit to 5 for display
          };
        })
      );
      
      return broadcastersWithStats;
    },
  });
}

export function useBroadcaster(id: string | null) {
  return useQuery({
    queryKey: ['broadcaster', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('broadcasters')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Broadcaster;
    },
    enabled: !!id,
  });
}

export function useBroadcastersStats() {
  return useQuery({
    queryKey: ['broadcasters-stats'],
    queryFn: async () => {
      const { data: broadcasters, error } = await supabase
        .from('broadcasters')
        .select('id, status');
      
      if (error) throw error;
      
      const { count: rightsCount } = await supabase
        .from('rights_events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      const stats = {
        total: broadcasters?.length || 0,
        active: broadcasters?.filter(b => b.status === 'active').length || 0,
        suspended: broadcasters?.filter(b => b.status === 'suspended').length || 0,
        pending: broadcasters?.filter(b => b.status === 'pending').length || 0,
        activeRights: rightsCount || 0,
      };
      
      return stats;
    },
  });
}
