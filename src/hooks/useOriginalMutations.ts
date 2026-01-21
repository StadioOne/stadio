import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminApi, handleApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type OriginalInsert = Database['public']['Tables']['originals']['Insert'];
type OriginalUpdate = Database['public']['Tables']['originals']['Update'];

export function useOriginalMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();

  const invalidateOriginals = () => {
    queryClient.invalidateQueries({ queryKey: ['originals'] });
    queryClient.invalidateQueries({ queryKey: ['originals-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createOriginal = useMutation({
    mutationFn: async (data: Omit<OriginalInsert, 'created_by'>) => {
      const { data: original, error } = await supabase
        .from('originals')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return original;
    },
    onSuccess: () => {
      invalidateOriginals();
      toast.success(t('originals.createSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const updateOriginal = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OriginalUpdate }) => {
      const { data: original, error } = await supabase
        .from('originals')
        .update({
          ...data,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return original;
    },
    onSuccess: (_, variables) => {
      invalidateOriginals();
      queryClient.invalidateQueries({ queryKey: ['original', variables.id] });
      toast.success(t('originals.updateSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const deleteOriginal = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting status to archived
      const { error } = await supabase
        .from('originals')
        .update({ 
          status: 'archived',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateOriginals();
      toast.success(t('originals.deleteSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const publishOriginal = useMutation({
    mutationFn: (id: string) => adminApi.originals.publish(id),
    onSuccess: () => {
      invalidateOriginals();
      toast.success(t('originals.publishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const unpublishOriginal = useMutation({
    mutationFn: (id: string) => adminApi.originals.unpublish(id),
    onSuccess: () => {
      invalidateOriginals();
      toast.success(t('originals.unpublishSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const duplicateOriginal = useMutation({
    mutationFn: async (id: string) => {
      // Fetch the original to duplicate
      const { data: original, error: fetchError } = await supabase
        .from('originals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy with modified title
      const { data: duplicate, error: insertError } = await supabase
        .from('originals')
        .insert({
          type: original.type,
          title_fr: `[Copie] ${original.title_fr}`,
          title_en: original.title_en ? `[Copy] ${original.title_en}` : null,
          excerpt_fr: original.excerpt_fr,
          excerpt_en: original.excerpt_en,
          content_fr: original.content_fr,
          content_en: original.content_en,
          cover_image_url: original.cover_image_url,
          media_url: original.media_url,
          duration_seconds: original.duration_seconds,
          author_id: original.author_id,
          category_ids: original.category_ids,
          related_event_ids: original.related_event_ids,
          meta_title: original.meta_title,
          meta_description: original.meta_description,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return duplicate;
    },
    onSuccess: () => {
      invalidateOriginals();
      toast.success(t('originals.duplicateSuccess'));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  return {
    createOriginal,
    updateOriginal,
    deleteOriginal,
    publishOriginal,
    unpublishOriginal,
    duplicateOriginal,
  };
}
