import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users-owner-count'] });
  };

  const updateRole = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AdminRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('users.updateSuccess'));
      invalidateUsers();
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error(t('common.error'));
    },
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('users.removeSuccess'));
      invalidateUsers();
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast.error(t('common.error'));
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
      // Check if user already has a role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingRole) {
        throw new Error('USER_ALREADY_ADMIN');
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('users.addSuccess'));
      invalidateUsers();
    },
    onError: (error) => {
      console.error('Error adding role:', error);
      if (error.message === 'USER_ALREADY_ADMIN') {
        toast.error(t('users.userAlreadyAdmin'));
      } else {
        toast.error(t('common.error'));
      }
    },
  });

  return {
    updateRole,
    removeRole,
    addRole,
  };
}
