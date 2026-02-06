import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardKPIs } from '@/lib/api-types';

export function useDashboardKPIs() {
  return useQuery<DashboardKPIs>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => adminApi.dashboard.getKPIs(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, api_title, override_title, sport, league, event_date, is_live, status')
        .gte('event_date', new Date().toISOString())
        .in('status', ['draft', 'published'])
        .order('event_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, actor_email, actor_role, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
