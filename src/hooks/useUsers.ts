import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

export interface UserWithRole {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  roleId: string;
  createdAt: string;
}

export interface UsersFilters {
  search?: string;
  role?: AdminRole | 'all';
}

export interface UsersStats {
  total: number;
  owners: number;
  admins: number;
  editors: number;
  support: number;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      let query = supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles!inner(email, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search if provided (client-side for now due to Supabase limitations with nested filters)
      let users = (data as unknown as UserRoleRow[]).map((row): UserWithRole => ({
        id: row.id,
        userId: row.user_id,
        email: row.profiles.email || '',
        fullName: row.profiles.full_name,
        avatarUrl: row.profiles.avatar_url,
        role: row.role,
        roleId: row.id,
        createdAt: row.created_at,
      }));

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        users = users.filter(user => 
          user.email.toLowerCase().includes(searchLower) ||
          (user.fullName?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      return users;
    },
  });
}

export function useUsersStats() {
  return useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');

      if (error) throw error;

      const stats: UsersStats = {
        total: data.length,
        owners: data.filter(r => r.role === 'owner').length,
        admins: data.filter(r => r.role === 'admin').length,
        editors: data.filter(r => r.role === 'editor').length,
        support: data.filter(r => r.role === 'support').length,
      };

      return stats;
    },
  });
}

export function useOwnerCount() {
  return useQuery({
    queryKey: ['admin-users-owner-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner');

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useUserByEmail(email: string) {
  return useQuery({
    queryKey: ['admin-user-by-email', email],
    queryFn: async () => {
      if (!email.trim()) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, avatar_url')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!email.trim(),
  });
}
