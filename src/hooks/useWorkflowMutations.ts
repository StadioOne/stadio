import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminApi, handleApiError } from '@/lib/api';
import type { WorkflowType } from '@/lib/api-types';
import { workflowQueryKeys } from './useWorkflows';

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      workflow,
      params,
    }: {
      workflow: WorkflowType;
      params?: Record<string, unknown>;
    }) => {
      return adminApi.workflows.trigger(workflow, params);
    },
    onSuccess: (data) => {
      // Invalidate all workflow-related queries
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.runs() });
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.lastRuns });
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.runsCount });
      
      toast.success(t('workflows.triggerSuccess', { name: data.workflow }));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}
