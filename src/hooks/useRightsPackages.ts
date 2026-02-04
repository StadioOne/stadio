import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PackageScope = Database['public']['Enums']['package_scope'];
export type RightsStatus = Database['public']['Enums']['rights_status'];

export interface RightsPackage {
  id: string;
  broadcaster_id: string;
  name: string;
  scope_type: PackageScope;
  sport_id: string | null;
  league_id: string | null;
  season: number | null;
  start_at: string;
  end_at: string;
  is_exclusive_default: boolean;
  territories_default: string[];
  status: RightsStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sport?: { name: string; name_fr: string | null } | null;
  league?: { name: string; name_fr: string | null; logo_url: string | null } | null;
  rights_count?: number;
}

export interface PackageFilters {
  broadcasterId: string;
  status?: RightsStatus | 'all';
  scopeType?: PackageScope | 'all';
  search?: string;
}

export function useRightsPackages(filters: PackageFilters) {
  return useQuery({
    queryKey: ['rights-packages', filters],
    queryFn: async () => {
      let query = supabase
        .from('rights_packages')
        .select(`
          *,
          sport:sports(name, name_fr),
          league:leagues(name, name_fr, logo_url)
        `)
        .eq('broadcaster_id', filters.broadcasterId)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.scopeType && filters.scopeType !== 'all') {
        query = query.eq('scope_type', filters.scopeType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let results = (data || []) as unknown as RightsPackage[];

      // Filter by search locally
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter((p) => 
          p.name.toLowerCase().includes(searchLower) ||
          p.sport?.name?.toLowerCase().includes(searchLower) ||
          p.league?.name?.toLowerCase().includes(searchLower)
        );
      }

      // Get rights count for each package
      const packageIds = results.map((p) => p.id);
      if (packageIds.length > 0) {
        const { data: rightsCounts } = await supabase
          .from('rights_events')
          .select('package_id')
          .in('package_id', packageIds);

        const countsMap = (rightsCounts || []).reduce((acc, r) => {
          if (r.package_id) {
            acc[r.package_id] = (acc[r.package_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        results = results.map((p) => ({
          ...p,
          rights_count: countsMap[p.id] || 0,
        }));
      }

      return results;
    },
    enabled: !!filters.broadcasterId,
  });
}

export function usePackageStats(broadcasterId: string) {
  return useQuery({
    queryKey: ['packages-stats', broadcasterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rights_packages')
        .select('status, scope_type')
        .eq('broadcaster_id', broadcasterId);

      if (error) throw error;

      return {
        total: data?.length || 0,
        active: data?.filter((p) => p.status === 'active').length || 0,
        draft: data?.filter((p) => p.status === 'draft').length || 0,
        bySport: data?.filter((p) => p.scope_type === 'sport').length || 0,
        byCompetition: data?.filter((p) => p.scope_type === 'competition').length || 0,
        bySeason: data?.filter((p) => p.scope_type === 'season').length || 0,
      };
    },
    enabled: !!broadcasterId,
  });
}
