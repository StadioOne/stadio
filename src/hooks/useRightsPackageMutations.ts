import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PackageInsert = Database['public']['Tables']['rights_packages']['Insert'];
type PackageUpdate = Database['public']['Tables']['rights_packages']['Update'];

export function useRightsPackageMutations() {
  const queryClient = useQueryClient();

  const createPackage = useMutation({
    mutationFn: async (data: PackageInsert) => {
      const { data: result, error } = await supabase
        .from('rights_packages')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Contrat créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating package:', error);
      toast.error('Erreur lors de la création du contrat');
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, ...data }: PackageUpdate & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rights_packages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Contrat mis à jour');
    },
    onError: (error) => {
      console.error('Error updating package:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const activatePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rights_packages')
        .update({ status: 'active' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-stats'] });
      toast.success('Contrat activé');
    },
    onError: (error) => {
      console.error('Error activating package:', error);
      toast.error("Erreur lors de l'activation");
    },
  });

  const expirePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rights_packages')
        .update({ status: 'expired' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-stats'] });
      toast.success('Contrat expiré');
    },
    onError: (error) => {
      console.error('Error expiring package:', error);
      toast.error("Erreur lors de l'expiration");
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rights_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      toast.success('Contrat supprimé');
    },
    onError: (error) => {
      console.error('Error deleting package:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    createPackage,
    updatePackage,
    activatePackage,
    expirePackage,
    deletePackage,
  };
}
