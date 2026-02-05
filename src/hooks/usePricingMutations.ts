import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminApi, handleApiError } from '@/lib/api';
import { pricingQueryKeys } from './usePricing';
import { eventQueryKeys } from './useEvents';
import type { Database } from '@/integrations/supabase/types';

type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];
type PricingTier = Database['public']['Enums']['pricing_tier'];

export interface UpdatePricingConfigData {
  min_price?: number;
  max_price?: number;
  base_price?: number;
}

export interface UpdateEventPricingData {
  manual_price?: number | null;
  manual_tier?: PricingTier | null;
  is_manual_override: boolean;
}

// Update pricing tier configuration (owner only)
export function useUpdatePricingConfig() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: UpdatePricingConfigData }) => {
      const { data: updated, error } = await supabase
        .from('pricing_config')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', tierId)
        .select()
        .single();

      if (error) throw error;
      return updated as PricingConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.config() });
      toast.success(t('pricing.configUpdated', 'Configuration mise à jour'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// Update event pricing (admin+)
export function useUpdateEventPricing() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: UpdateEventPricingData }) => {
      const { data: updated, error } = await supabase
        .from('event_pricing')
        .upsert(
          {
            event_id: eventId,
            manual_price: data.manual_price,
            manual_tier: data.manual_tier,
            is_manual_override: data.is_manual_override,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('pricing.eventUpdated', 'Prix de l\'événement mis à jour'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// Recompute single event pricing
export function useRecomputeEventPricing() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (eventId: string) => {
      return adminApi.pricing.recompute({ eventId });
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('pricing.recomputed', 'Prix recalculé'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// Batch recompute all events pricing (admin+)
export function useBatchRecompute() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      // Call the edge function with batch mode
      const response = await adminApi.pricing.recompute({ batch: true } as any);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      const count = data?.processed || 0;
      toast.success(t('pricing.batchRecomputed', '{{count}} événements recalculés', { count }));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// Revert to computed price (remove manual override)
export function useRevertToComputed() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: updated, error } = await supabase
        .from('event_pricing')
        .update({
          manual_price: null,
          manual_tier: null,
          is_manual_override: false,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('pricing.revertedToComputed', 'Revenu au prix calculé'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}
