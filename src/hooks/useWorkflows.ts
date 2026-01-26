import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type WorkflowRun = Database['public']['Tables']['workflow_runs']['Row'];
export type WorkflowStatus = Database['public']['Enums']['workflow_status'];

export interface WorkflowsFilters {
  workflow?: string;
  status?: WorkflowStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface WorkflowsStats {
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  avgDurationMs: number | null;
}

// Query keys
export const workflowQueryKeys = {
  runs: (filters?: WorkflowsFilters) => ['workflow-runs', filters] as const,
  stats: ['workflow-stats'] as const,
  lastRuns: ['workflow-last-runs'] as const,
  runsCount: ['workflow-runs-count'] as const,
};

// Get workflow runs with filters and pagination
export function useWorkflowRuns(filters?: WorkflowsFilters) {
  return useQuery({
    queryKey: workflowQueryKeys.runs(filters),
    queryFn: async () => {
      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;

      let query = supabase
        .from('workflow_runs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.workflow && filters.workflow !== 'all') {
        query = query.eq('workflow_name', filters.workflow);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as WorkflowRun[],
        meta: {
          total: count ?? 0,
          limit,
          offset,
          hasMore: (count ?? 0) > offset + limit,
        },
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Get total count for pagination
export function useWorkflowRunsCount(filters?: Pick<WorkflowsFilters, 'workflow' | 'status'>) {
  return useQuery({
    queryKey: [...workflowQueryKeys.runsCount, filters],
    queryFn: async () => {
      let query = supabase
        .from('workflow_runs')
        .select('*', { count: 'exact', head: true });

      if (filters?.workflow && filters.workflow !== 'all') {
        query = query.eq('workflow_name', filters.workflow);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count ?? 0;
    },
  });
}

// Get statistics for workflows
export function useWorkflowsStats() {
  return useQuery<WorkflowsStats>({
    queryKey: workflowQueryKeys.stats,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('status, duration_ms');

      if (error) throw error;

      const durations = data
        .map((r) => r.duration_ms)
        .filter((d): d is number => d !== null && d > 0);

      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null;

      return {
        total: data.length,
        pending: data.filter((r) => r.status === 'pending').length,
        running: data.filter((r) => r.status === 'running').length,
        success: data.filter((r) => r.status === 'success').length,
        failed: data.filter((r) => r.status === 'failed').length,
        avgDurationMs: avgDuration,
      };
    },
    staleTime: 1000 * 30,
  });
}

// Get last run for each workflow
export function useWorkflowLastRuns() {
  return useQuery({
    queryKey: workflowQueryKeys.lastRuns,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by workflow_name and take the first (most recent) for each
      const lastRunsByWorkflow = new Map<string, WorkflowRun>();
      for (const run of data) {
        if (!lastRunsByWorkflow.has(run.workflow_name)) {
          lastRunsByWorkflow.set(run.workflow_name, run);
        }
      }

      return lastRunsByWorkflow;
    },
    staleTime: 1000 * 30,
  });
}

// Get unique workflow names for filter dropdown
export function useWorkflowNames() {
  return useQuery({
    queryKey: ['workflow-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('workflow_name')
        .order('workflow_name');

      if (error) throw error;

      const uniqueNames = [...new Set(data.map((r) => r.workflow_name))];
      return uniqueNames;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
