import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BroadcasterStatus } from './useBroadcasters';

export interface CreateBroadcasterData {
  name: string;
  legal_name?: string;
  logo_url?: string;
  contact_email?: string;
  status?: BroadcasterStatus;
  notes?: string;
}

export interface UpdateBroadcasterData extends Partial<CreateBroadcasterData> {
  id: string;
}

export function useBroadcasterMutations() {
  const queryClient = useQueryClient();

  const createBroadcaster = useMutation({
    mutationFn: async (data: CreateBroadcasterData) => {
      const { data: result, error } = await supabase
        .from('broadcasters')
        .insert({
          name: data.name,
          legal_name: data.legal_name || null,
          logo_url: data.logo_url || null,
          contact_email: data.contact_email || null,
          status: data.status || 'pending',
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters-stats'] });
      toast.success('Diffuseur créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating broadcaster:', error);
      toast.error('Erreur lors de la création du diffuseur');
    },
  });

  const updateBroadcaster = useMutation({
    mutationFn: async ({ id, ...data }: UpdateBroadcasterData) => {
      const { data: result, error } = await supabase
        .from('broadcasters')
        .update({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.legal_name !== undefined && { legal_name: data.legal_name }),
          ...(data.logo_url !== undefined && { logo_url: data.logo_url }),
          ...(data.contact_email !== undefined && { contact_email: data.contact_email }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.notes !== undefined && { notes: data.notes }),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      queryClient.invalidateQueries({ queryKey: ['broadcaster'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters-stats'] });
      toast.success('Diffuseur mis à jour');
    },
    onError: (error) => {
      console.error('Error updating broadcaster:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteBroadcaster = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('broadcasters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters-stats'] });
      toast.success('Diffuseur supprimé');
    },
    onError: (error) => {
      console.error('Error deleting broadcaster:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BroadcasterStatus }) => {
      const { error } = await supabase
        .from('broadcasters')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['broadcasters'] });
      queryClient.invalidateQueries({ queryKey: ['broadcaster'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasters-stats'] });
      const message = status === 'active' ? 'Diffuseur activé' : 
                      status === 'suspended' ? 'Diffuseur suspendu' : 'Statut mis à jour';
      toast.success(message);
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Erreur lors du changement de statut');
    },
  });

  return {
    createBroadcaster,
    updateBroadcaster,
    deleteBroadcaster,
    updateStatus,
  };
}
