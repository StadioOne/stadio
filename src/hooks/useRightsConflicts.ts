import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConflictCheckParams {
  eventIds: string[];
  broadcasterId?: string;
  excludeBroadcasterId?: string;
  excludeRightId?: string;
  territories: string[];
  exclusivity: 'exclusive' | 'shared' | 'non_exclusive';
}

export interface RightsConflict {
  rightId: string;
  eventId: string;
  eventTitle: string;
  broadcasterName: string;
  broadcasterId: string;
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
      let query = supabase
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
        .eq('status', 'active');

      // Exclude the broadcaster we're assigning to (for bulk) or specific right (for edit)
      if (params.broadcasterId) {
        query = query.neq('broadcaster_id', params.broadcasterId);
      }
      if (params.excludeBroadcasterId) {
        query = query.neq('broadcaster_id', params.excludeBroadcasterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter for territory overlaps
      const conflicts: RightsConflict[] = [];
      
      for (const right of data || []) {
        // Skip the right being edited
        if (params.excludeRightId && right.id === params.excludeRightId) {
          continue;
        }

        const overlappingTerritories = (right.territories_allowed as string[]).filter(
          (t) => params.territories.includes(t)
        );

        if (overlappingTerritories.length > 0) {
          const event = right.events as { api_title: string | null; override_title: string | null; home_team: string | null; away_team: string | null };
          const broadcaster = right.broadcasters as { name: string };
          
          conflicts.push({
            rightId: right.id,
            eventId: right.event_id,
            eventTitle: event.override_title || event.api_title || 
              `${event.home_team || ''} vs ${event.away_team || ''}`,
            broadcasterName: broadcaster.name,
            broadcasterId: right.broadcaster_id,
            territories: overlappingTerritories,
          });
        }
      }

      return conflicts;
    },
    enabled: !!params && params.eventIds.length > 0 && params.exclusivity === 'exclusive',
  });
}
