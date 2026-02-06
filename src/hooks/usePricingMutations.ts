import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleApiError } from '@/lib/api';
import { pricingQueryKeys } from './usePricing';
import { eventQueryKeys } from './useEvents';

// Update event price directly on events table
export function useUpdateEventPrice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ eventId, price }: { eventId: string; price: number | null }) => {
      const { data, error } = await supabase
        .from('events')
        .update({ price, updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('pricing.eventUpdated', 'Prix mis à jour'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// AI suggest price via Mistral
export function useSuggestPrice() {
  return useMutation({
    mutationFn: async (params: {
      sport?: string;
      league?: string | null;
      home_team?: string | null;
      away_team?: string | null;
      event_date?: string;
    }) => {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-suggest-price`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la suggestion');
      }
      return result.data as { price: number };
    },
  });
}
