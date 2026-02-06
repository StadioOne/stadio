import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AppUser {
  id: string;
  email: string | undefined;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  isBanned: boolean;
  bannedUntil: string | null;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface AppUserStats {
  total: number;
  active: number;
  banned: number;
  newLast30d: number;
}

export interface AppUsersFilters {
  search?: string;
  status?: 'all' | 'active' | 'banned';
  page?: number;
  perPage?: number;
}

async function callAppUsersFunction(action: string, params: Record<string, string> = {}, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams({ action, ...params });
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-app-users?${queryParams}`;

  const options: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export function useAppUsers(filters: AppUsersFilters = {}) {
  return useQuery({
    queryKey: ['app-users', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.perPage) params.perPage = String(filters.perPage);

      const data = await callAppUsersFunction('list', params);

      let users: AppUser[] = data.users;

      // Client-side status filter
      if (filters.status === 'active') {
        users = users.filter(u => !u.isBanned);
      } else if (filters.status === 'banned') {
        users = users.filter(u => u.isBanned);
      }

      return { users, stats: data.stats as AppUserStats, total: data.total as number };
    },
    staleTime: 1000 * 30,
  });
}

export function useAppUserMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const banUser = useMutation({
    mutationFn: (userId: string) => callAppUsersFunction('ban', {}, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      toast.success(t('users.app.banSuccess'));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unbanUser = useMutation({
    mutationFn: (userId: string) => callAppUsersFunction('unban', {}, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      toast.success(t('users.app.unbanSuccess'));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAppUsersFunction('delete', {}, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      toast.success(t('users.app.deleteSuccess'));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { banUser, unbanUser, deleteUser };
}
