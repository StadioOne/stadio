import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, handleApiError } from '@/lib/api';
import type { AnalyticsFilters } from '@/lib/api-types';
import { toast } from '@/hooks/use-toast';

// Query keys
export const analyticsQueryKeys = {
  overview: (dateFrom?: string, dateTo?: string) => ['analytics', 'overview', dateFrom, dateTo],
  fixtures: (filters?: AnalyticsFilters) => ['analytics', 'fixtures', filters],
  originals: (filters?: AnalyticsFilters) => ['analytics', 'originals', filters],
  geo: (dateFrom?: string, dateTo?: string, entityType?: string) => ['analytics', 'geo', dateFrom, dateTo, entityType],
};

// Overview hook
export function useAnalyticsOverview(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: analyticsQueryKeys.overview(dateFrom, dateTo),
    queryFn: () => adminApi.analytics.getOverview(dateFrom, dateTo),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fixtures analytics hook
export function useAnalyticsFixtures(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsQueryKeys.fixtures(filters),
    queryFn: () => adminApi.analytics.getFixtures(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// Originals analytics hook
export function useAnalyticsOriginals(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsQueryKeys.originals(filters),
    queryFn: () => adminApi.analytics.getOriginals(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// Geo analytics hook
export function useAnalyticsGeo(dateFrom?: string, dateTo?: string, entityType?: string) {
  return useQuery({
    queryKey: analyticsQueryKeys.geo(dateFrom, dateTo, entityType),
    queryFn: () => adminApi.analytics.getGeo(dateFrom, dateTo, entityType),
    staleTime: 5 * 60 * 1000,
  });
}

// Aggregation mutation hook
export function useAggregateAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (date?: string) => adminApi.analytics.aggregate(date),
    onSuccess: (data) => {
      toast({
        title: 'Agrégation terminée',
        description: `${data.totalRowsUpserted} lignes traitées en ${data.durationMs}ms`,
      });
      // Invalidate all analytics queries
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: handleApiError(error),
        variant: 'destructive',
      });
    },
  });
}
