import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
  metadata: Record<string, unknown> | null;
  createdAt: string;
  ipAddress: string | null;
}

export interface AuditLogsFilters {
  entity?: string;
  action?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

async function fetchAuditLogs(filters: AuditLogsFilters): Promise<AuditLogsResponse> {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    throw new Error('Not authenticated');
  }

  const queryParams = new URLSearchParams();
  
  if (filters.entity) queryParams.set('entity', filters.entity);
  if (filters.action) queryParams.set('action', filters.action);
  if (filters.actorUserId) queryParams.set('actorUserId', filters.actorUserId);
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
  if (filters.limit) queryParams.set('limit', filters.limit.toString());
  if (filters.offset) queryParams.set('offset', filters.offset.toString());

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-audit-log?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch audit logs');
  }

  return {
    logs: result.data.logs || [],
    pagination: result.data.pagination || {
      total: 0,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hasMore: false,
    },
  };
}

export function useAuditLogs(filters: AuditLogsFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to get unique values for filters
export function useAuditFilterOptions() {
  return useQuery({
    queryKey: ['audit-filter-options'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      // Fetch a larger set to get unique values
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-audit-log?limit=100`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { actors: [], actions: [], entities: [] };
      }

      const logs = result.data.logs || [];
      
      const actors = [...new Set(logs.map((l: AuditLogEntry) => l.actorEmail).filter(Boolean))] as string[];
      const actions = [...new Set(logs.map((l: AuditLogEntry) => l.action).filter(Boolean))] as string[];
      const entities = [...new Set(logs.map((l: AuditLogEntry) => l.entity).filter(Boolean))] as string[];

      return { actors, actions, entities };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
