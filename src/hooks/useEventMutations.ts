import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminApi, handleApiError } from '@/lib/api';
import { eventQueryKeys } from './useEvents';
import type { EventUpdate } from '@/lib/api-types';

export function usePublishEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (eventId: string) => adminApi.events.publish(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('events.publishSuccess', 'Événement publié'));
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
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(eventId) });
      toast.success(t('events.unpublishSuccess', 'Événement dépublié'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventUpdate> }) => {
      const { data: updated, error } = await supabase
        .from('events')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(id) });
      toast.success(t('events.updateSuccess', 'Événement mis à jour'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useToggleLive() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, isLive }: { id: string; isLive: boolean }) => {
      const { data, error } = await supabase
        .from('events')
        .update({ is_live: isLive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(id) });
      toast.success(
        data.is_live 
          ? t('events.liveStarted', 'Événement en direct') 
          : t('events.liveStopped', 'Direct arrêté')
      );
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useTogglePinned() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from('events')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.detail(id) });
      toast.success(
        data.is_pinned 
          ? t('events.pinned', 'Événement épinglé') 
          : t('events.unpinned', 'Événement désépinglé')
      );
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}
