import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AuthorInsert = Database['public']['Tables']['authors']['Insert'];
type AuthorUpdate = Database['public']['Tables']['authors']['Update'];

export function useAuthorMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateAuthors = () => {
    queryClient.invalidateQueries({ queryKey: ['authors'] });
    queryClient.invalidateQueries({ queryKey: ['authors-stats'] });
    queryClient.invalidateQueries({ queryKey: ['active-authors'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createAuthor = useMutation({
    mutationFn: async (data: AuthorInsert) => {
      const { data: author, error } = await supabase
        .from('authors')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return author;
    },
    onSuccess: () => {
      invalidateAuthors();
      toast.success(t('authors.createSuccess'));
    },
    onError: (error) => {
      console.error('Create author error:', error);
      toast.error(t('common.error'));
    },
  });

  const updateAuthor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AuthorUpdate }) => {
      const { data: author, error } = await supabase
        .from('authors')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return author;
    },
    onSuccess: () => {
      invalidateAuthors();
      toast.success(t('authors.updateSuccess'));
    },
    onError: (error) => {
      console.error('Update author error:', error);
      toast.error(t('common.error'));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data: author, error } = await supabase
        .from('authors')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return author;
    },
    onSuccess: (_, variables) => {
      invalidateAuthors();
      toast.success(
        variables.isActive 
          ? t('authors.activateSuccess') 
          : t('authors.deactivateSuccess')
      );
    },
    onError: (error) => {
      console.error('Toggle active error:', error);
      toast.error(t('common.error'));
    },
  });

  const deleteAuthor = useMutation({
    mutationFn: async (id: string) => {
      // First check if author has any contents
      const { data: contents, error: checkError } = await supabase
        .from('originals')
        .select('id')
        .eq('author_id', id)
        .neq('status', 'archived')
        .limit(1);

      if (checkError) throw checkError;

      if (contents && contents.length > 0) {
        throw new Error('AUTHOR_HAS_CONTENTS');
      }

      const { error } = await supabase
        .from('authors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAuthors();
      toast.success(t('authors.deleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete author error:', error);
      if (error.message === 'AUTHOR_HAS_CONTENTS') {
        toast.error(t('authors.cannotDelete'));
      } else {
        toast.error(t('common.error'));
      }
    },
  });

  return {
    createAuthor,
    updateAuthor,
    toggleActive,
    deleteAuthor,
  };
}
