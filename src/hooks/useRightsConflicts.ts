import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConflictCheckParams {
  eventIds: string[];
  broadcasterId: string;
  territories: string[];
  exclusivity: 'exclusive' | 'shared' | 'non_exclusive';
}

export interface RightsConflict {
  eventId: string;
  eventTitle: string;
  conflictingBroadcaster: string;
  conflictingBroadcasterId: string;
  territories: string[];
}

export function useRightsConflicts(params: ConflictCheckParams | null) {
  return useQuery({
    queryKey: ['rights-conflicts', params],
    queryFn: async () => {
      if (!params || params.eventIds.length === 0 || params.exclusivity !== 'exclusive') {
        return [];
      }

      // Check for existing exclusive rights on the same events/territories
      const { data, error } = await supabase
        .from('rights_events')
        .select(`
          id,
          event_id,
          territories_allowed,
          broadcaster_id,
          broadcasters!inner(name),
          events!inner(api_title, override_title, home_team, away_team)
        `)
        .in('event_id', params.eventIds)
        .eq('exclusivity', 'exclusive')
        .eq('status', 'active')
        .neq('broadcaster_id', params.broadcasterId);

      if (error) throw error;

      // Filter for territory overlaps
      const conflicts: RightsConflict[] = [];
      
      for (const right of data || []) {
        const overlappingTerritories = (right.territories_allowed as string[]).filter(
          (t) => params.territories.includes(t)
        );

        if (overlappingTerritories.length > 0) {
          const event = right.events as { api_title: string | null; override_title: string | null; home_team: string | null; away_team: string | null };
          const broadcaster = right.broadcasters as { name: string };
          
          conflicts.push({
            eventId: right.event_id,
            eventTitle: event.override_title || event.api_title || 
              `${event.home_team || ''} vs ${event.away_team || ''}`,
            conflictingBroadcaster: broadcaster.name,
            conflictingBroadcasterId: right.broadcaster_id,
            territories: overlappingTerritories,
          });
        }
      }

      return conflicts;
    },
    enabled: !!params && params.eventIds.length > 0 && params.exclusivity === 'exclusive',
  });
}
