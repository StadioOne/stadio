import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PackageScope = Database['public']['Enums']['package_scope'];

export interface BroadcasterSuggestion {
  broadcaster: {
    id: string;
    name: string;
    logo_url: string | null;
    status: Database['public']['Enums']['broadcaster_status'];
  };
  matchType: PackageScope;
  packageName: string;
  packageId: string;
}

interface UseBroadcasterSuggestionsParams {
  sportId: string | null;
  leagueId: string | null;
  eventDate: string | null;
}

export function useBroadcasterSuggestions({ sportId, leagueId, eventDate }: UseBroadcasterSuggestionsParams) {
  return useQuery({
    queryKey: ['broadcaster-suggestions', sportId, leagueId, eventDate],
    queryFn: async () => {
      if (!eventDate) return [];

      // Fetch active packages that match the event criteria
      let query = supabase
        .from('rights_packages')
        .select(`
          id,
          name,
          scope_type,
          sport_id,
          league_id,
          season,
          broadcaster_id,
          broadcaster:broadcasters(id, name, logo_url, status)
        `)
        .eq('status', 'active')
        .lte('start_at', eventDate)
        .gte('end_at', eventDate);

      const { data: packages, error } = await query;

      if (error) throw error;
      if (!packages || packages.length === 0) return [];

      // Filter packages that match the event's sport/league
      const suggestions: BroadcasterSuggestion[] = [];
      const seenBroadcasters = new Set<string>();

      for (const pkg of packages) {
        // Skip if broadcaster already suggested with higher priority
        if (seenBroadcasters.has(pkg.broadcaster_id)) continue;

        const broadcaster = pkg.broadcaster as unknown as BroadcasterSuggestion['broadcaster'];
        if (!broadcaster || broadcaster.status !== 'active') continue;

        let matches = false;
        let matchType: PackageScope = pkg.scope_type;

        switch (pkg.scope_type) {
          case 'sport':
            // Sport-level package matches if sport_id matches
            if (sportId && pkg.sport_id === sportId) {
              matches = true;
            }
            break;

          case 'competition':
            // Competition-level package matches if league_id matches
            if (leagueId && pkg.league_id === leagueId) {
              matches = true;
            }
            break;

          case 'season':
            // Season-level package matches if league_id matches (season is within date range)
            if (leagueId && pkg.league_id === leagueId) {
              matches = true;
            }
            break;
        }

        if (matches) {
          seenBroadcasters.add(pkg.broadcaster_id);
          suggestions.push({
            broadcaster,
            matchType,
            packageName: pkg.name,
            packageId: pkg.id,
          });
        }
      }

      // Sort by match type priority: season > competition > sport
      const priority: Record<PackageScope, number> = {
        season: 1,
        competition: 2,
        sport: 3,
      };

      return suggestions.sort((a, b) => priority[a.matchType] - priority[b.matchType]);
    },
    enabled: !!eventDate,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useAllBroadcasters(search?: string) {
  return useQuery({
    queryKey: ['all-broadcasters', search],
    queryFn: async () => {
      let query = supabase
        .from('broadcasters')
        .select('id, name, logo_url, status')
        .eq('status', 'active')
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
