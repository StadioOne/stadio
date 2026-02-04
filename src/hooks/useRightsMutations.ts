import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type RightsEventInsert = Database['public']['Tables']['rights_events']['Insert'];
type RightsEventUpdate = Database['public']['Tables']['rights_events']['Update'];

export function useRightsMutations() {
  const queryClient = useQueryClient();

  const createRight = useMutation({
    mutationFn: async (data: RightsEventInsert) => {
      const { data: result, error } = await supabase
        .from('rights_events')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-events'] });
      queryClient.invalidateQueries({ queryKey: ['rights-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Droit créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating right:', error);
      toast.error('Erreur lors de la création du droit');
    },
  });

  const updateRight = useMutation({
    mutationFn: async ({ id, ...data }: RightsEventUpdate & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rights_events')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-events'] });
      queryClient.invalidateQueries({ queryKey: ['rights-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Droit mis à jour');
    },
    onError: (error) => {
      console.error('Error updating right:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const revokeRight = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rights_events')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-events'] });
      queryClient.invalidateQueries({ queryKey: ['rights-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Droit révoqué');
    },
    onError: (error) => {
      console.error('Error revoking right:', error);
      toast.error('Erreur lors de la révocation');
    },
  });

  const deleteRight = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rights_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-events'] });
      queryClient.invalidateQueries({ queryKey: ['rights-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Droit supprimé');
    },
    onError: (error) => {
      console.error('Error deleting right:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    createRight,
    updateRight,
    revokeRight,
    deleteRight,
  };
}
