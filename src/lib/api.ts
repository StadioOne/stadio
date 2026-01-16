import { supabase } from '@/integrations/supabase/client';
import type {
  ApiResponse,
  DashboardKPIs,
  Event,
  EventPricing,
  Original,
  ListsRebuildResult,
  WorkflowType,
  WorkflowTriggerResult,
  AuditLog,
  AuditFilters,
  PaginatedResult,
  PricingRecomputeParams,
} from './api-types';

// Error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base function to call Edge Functions
async function callEdgeFunction<T>(
  functionName: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<T> {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    throw new ApiError('Not authenticated', 401);
  }

  let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session.access_token}`,
    },
    body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
  });

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    throw new ApiError(
      result.error || 'Unknown error',
      response.status
    );
  }

  return result.data as T;
}

// Centralized Admin API client
export const adminApi = {
  // Dashboard
  dashboard: {
    getKPIs: (): Promise<DashboardKPIs> => 
      callEdgeFunction<DashboardKPIs>('admin-dashboard', 'GET'),
  },

  // Events
  events: {
    publish: (eventId: string): Promise<Event> => 
      callEdgeFunction<Event>('admin-events-publish', 'POST', { eventId }),
    
    unpublish: (eventId: string): Promise<Event> => 
      callEdgeFunction<Event>('admin-events-unpublish', 'POST', { eventId }),
  },

  // Pricing
  pricing: {
    recompute: (params: PricingRecomputeParams): Promise<EventPricing> => 
      callEdgeFunction<EventPricing>('admin-pricing-recompute', 'POST', params as unknown as Record<string, unknown>),
  },

  // Originals
  originals: {
    publish: (id: string): Promise<Original> => 
      callEdgeFunction<Original>('admin-originals-publish', 'POST', { id }),
    
    unpublish: (id: string): Promise<Original> => 
      callEdgeFunction<Original>('admin-originals-unpublish', 'POST', { id }),
  },

  // Lists / Categories
  lists: {
    rebuild: (categoryId?: string): Promise<ListsRebuildResult> => 
      callEdgeFunction<ListsRebuildResult>('admin-lists-rebuild', 'POST', 
        categoryId ? { categoryId } : {}
      ),
  },

  // Workflows (n8n integration)
  workflows: {
    trigger: (workflow: WorkflowType, params?: Record<string, unknown>): Promise<WorkflowTriggerResult> => 
      callEdgeFunction<WorkflowTriggerResult>('admin-n8n-trigger', 'POST', { workflow, params }),
  },

  // Audit Log
  audit: {
    getLogs: (filters?: AuditFilters): Promise<PaginatedResult<AuditLog>> => {
      const queryParams: Record<string, string> = {};
      
      if (filters?.userId) queryParams.userId = filters.userId;
      if (filters?.action) queryParams.action = filters.action;
      if (filters?.entityType) queryParams.entityType = filters.entityType;
      if (filters?.entityId) queryParams.entityId = filters.entityId;
      if (filters?.startDate) queryParams.startDate = filters.startDate;
      if (filters?.endDate) queryParams.endDate = filters.endDate;
      if (filters?.limit) queryParams.limit = filters.limit.toString();
      if (filters?.offset) queryParams.offset = filters.offset.toString();

      return callEdgeFunction<AuditLog[]>('admin-audit-log', 'GET', undefined, queryParams)
        .then((data) => {
          // The API returns data with meta in the response
          // We need to reconstruct the paginated result
          return {
            data: data as unknown as AuditLog[],
            meta: {
              total: 0, // Will be populated from actual response
              limit: filters?.limit || 50,
              offset: filters?.offset || 0,
              hasMore: false,
            },
          };
        });
    },
  },
};

// Error handler for React Query
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
