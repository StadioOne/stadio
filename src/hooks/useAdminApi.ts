import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminApi, handleApiError } from '@/lib/api';
import type {
  DashboardKPIs,
  AuditFilters,
  AuditLog,
  PaginatedResult,
  WorkflowType,
  PricingRecomputeParams,
} from '@/lib/api-types';

// Query Keys
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  originals: ['originals'] as const,
  original: (id: string) => ['originals', id] as const,
  categories: ['categories'] as const,
  pricing: ['pricing'] as const,
  auditLogs: (filters?: AuditFilters) => ['audit-logs', filters] as const,
  workflows: ['workflows'] as const,
};

// ===============================
// Dashboard Hooks
// ===============================

export function useDashboardKPIs() {
  return useQuery<DashboardKPIs>({
    queryKey: queryKeys.dashboard,
    queryFn: () => adminApi.dashboard.getKPIs(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ===============================
// Events Hooks
// ===============================

export function usePublishEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (eventId: string) => adminApi.events.publish(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success(t('events.publishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useUnpublishEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (eventId: string) => adminApi.events.unpublish(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success(t('events.unpublishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// ===============================
// Pricing Hooks
// ===============================

export function useRecomputePricing() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (params: PricingRecomputeParams) => adminApi.pricing.recompute(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      toast.success(t('pricing.recomputeSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// ===============================
// Originals Hooks
// ===============================

export function usePublishOriginal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => adminApi.originals.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.originals });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success(t('originals.publishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useUnpublishOriginal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => adminApi.originals.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.originals });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success(t('originals.unpublishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// ===============================
// Lists/Categories Hooks
// ===============================

export function useRebuildLists() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (categoryId?: string) => adminApi.lists.rebuild(categoryId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      toast.success(
        t('lists.rebuildSuccess', { count: data.categoriesProcessed })
      );
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// ===============================
// Workflow Hooks
// ===============================

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ 
      workflow, 
      params 
    }: { 
      workflow: WorkflowType; 
      params?: Record<string, unknown> 
    }) => adminApi.workflows.trigger(workflow, params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows });
      toast.success(t('workflows.triggerSuccess', { name: data.workflow }));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// ===============================
// Audit Log Hooks
// ===============================

export function useAuditLogs(filters?: AuditFilters) {
  return useQuery<PaginatedResult<AuditLog>>({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: () => adminApi.audit.getLogs(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}
