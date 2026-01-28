import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface N8nWorkflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  triggerCount: number;
}

interface N8nWorkflowsResponse {
  data: N8nWorkflow[];
  count: number;
}

/**
 * Fetch workflows from n8n via Edge Function
 * Uses the n8n MCP connector to get real workflow data
 */
export function useN8nWorkflows() {
  return useQuery({
    queryKey: ['n8n-workflows'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke<N8nWorkflowsResponse>('admin-n8n-workflows', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
